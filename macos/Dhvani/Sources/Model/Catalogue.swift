import Foundation

/// Everything the website defines about what can be played, read from the
/// catalogue.json that scripts/build-mac.mjs writes out of src/audio and
/// src/lib. The app never keeps its own copy of a sound list.
struct Catalogue: Decodable {
    let groups: [SoundGroup]
    let sounds: [Sound]
    let presets: [CataloguePreset]
    let themes: [PaperTheme]
    let defaultTheme: String
    let credits: [Credit]

    static func load() -> Catalogue {
        guard
            let url = Bundle.main.url(forResource: "catalogue", withExtension: "json", subdirectory: "Engine"),
            let data = try? Data(contentsOf: url),
            let catalogue = try? JSONDecoder().decode(Catalogue.self, from: data)
        else {
            fatalError("catalogue.json is missing from the bundle. Run `npm run mac:assets`.")
        }
        return catalogue
    }

    func sound(_ id: String) -> Sound? { sounds.first { $0.id == id } }
    func sounds(in group: SoundGroup) -> [Sound] { sounds.filter { $0.group == group.id } }
    func theme(_ id: String?) -> PaperTheme {
        themes.first { $0.id == id } ?? themes.first { $0.id == defaultTheme } ?? themes[0]
    }
}

/// The person who recorded one of the field recordings, and where it lives.
struct Credit: Decodable, Identifiable {
    let id: String
    let title: String
    let author: String
    let license: String
    let licenseUrl: String
    let sourceUrl: String
}

struct SoundGroup: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let jp: String
    let blurb: String
}

struct Sound: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let jp: String
    let group: String
    let doodle: String
    let kind: String
    let defaultLevel: Double
    let note: String
    let credit: String?

    /// Recordings are marked 録 on the site, because they are the only things
    /// in the mix that can loop.
    var isRecording: Bool { kind == "sample" }
}

struct CataloguePreset: Decodable {
    let id: String
    let name: String
    let jp: String
    let blurb: String
    let mix: [String: Double]
    let music: MusicSetting?
    let theme: String?
}

struct PaperTheme: Decodable, Identifiable, Hashable {
    struct Colors: Decodable, Hashable {
        let paper, paper2, paper3, ink, inkSoft, line, accent, accentText, accent2, wash: String
    }

    let id: String
    let name: String
    let jp: String
    let mood: String
    let dark: Bool
    let colors: Colors
}

enum MusicMode: String, Codable, CaseIterable, Identifiable {
    case lofi, classical
    var id: String { rawValue }

    var name: String { self == .lofi ? "Lofi" : "Nocturne" }
    var jp: String { self == .lofi ? "低忠実" : "夜想" }
    var doodle: String { self == .lofi ? "cassette" : "nocturne" }
    var blurb: String {
        switch self {
        case .lofi: "A kit behind the beat, a Rhodes, and a tape that has been round the heads too many times."
        case .classical: "Strings, harp and a synthesised voice, moving through lament basses and real cadences."
        }
    }
}

struct MusicSetting: Codable, Hashable {
    var mode: MusicMode
    var level: Double
}

/// What the music deck reports about itself once a second.
struct NowPlayingMusic: Decodable, Equatable {
    let key: String
    let progression: String
    let bpm: Double
    let bar: Int
    let mode: String
}
