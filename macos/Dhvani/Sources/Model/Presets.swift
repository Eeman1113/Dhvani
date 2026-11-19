import Foundation
import Observation

/// A whole mix, recalled in one click: which sounds, how loud each one is,
/// the music deck, and optionally the master volume and the paper.
struct Preset: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var jp: String = ""
    var blurb: String = ""
    var mix: [String: Double]
    var music: MusicSetting?
    /// Nil leaves the master where it is.
    var master: Double?
    /// Nil leaves the paper alone.
    var theme: String?
    /// A doodle name. Nil means "draw whatever is loudest in the mix".
    var icon: String?
    var builtIn = false

    static func new(name: String) -> Preset {
        Preset(id: "user-\(UUID().uuidString.prefix(8).lowercased())", name: name, mix: [:])
    }
}

/// The built-in presets from the site, plus everything the user has saved.
@Observable
final class PresetLibrary {
    private(set) var user: [Preset] = []
    let builtIn: [Preset]
    var hiddenBuiltIns: Set<String> {
        didSet { UserDefaults.standard.set(Array(hiddenBuiltIns), forKey: "presets.hiddenBuiltIns") }
    }

    private let file: URL

    init(catalogue: Catalogue) {
        builtIn = catalogue.presets.map {
            Preset(id: $0.id, name: $0.name, jp: $0.jp, blurb: $0.blurb, mix: $0.mix, music: $0.music, theme: $0.theme, builtIn: true)
        }
        hiddenBuiltIns = Set(UserDefaults.standard.stringArray(forKey: "presets.hiddenBuiltIns") ?? [])

        let support = URL.applicationSupportDirectory.appending(path: "Dhvani", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        file = support.appending(path: "presets.json")
        if let data = try? Data(contentsOf: file), let saved = try? JSONDecoder().decode([Preset].self, from: data) {
            user = saved
        }
    }

    /// What the menu bar shows: the user's own first, in their order.
    var visible: [Preset] { user + builtIn.filter { !hiddenBuiltIns.contains($0.id) } }
    var all: [Preset] { user + builtIn }

    func preset(_ id: String?) -> Preset? {
        guard let id else { return nil }
        return all.first { $0.id == id }
    }

    func save(_ preset: Preset) {
        var p = preset
        p.builtIn = false
        if let i = user.firstIndex(where: { $0.id == p.id }) {
            user[i] = p
        } else {
            user.append(p)
        }
        persist()
    }

    func delete(_ id: String) {
        user.removeAll { $0.id == id }
        persist()
    }

    func move(from: IndexSet, to: Int) {
        user.move(fromOffsets: from, toOffset: to)
        persist()
    }

    /// A built-in cannot be edited, so editing one starts from a copy.
    func duplicate(_ preset: Preset) -> Preset {
        var copy = preset
        copy.id = Preset.new(name: "").id
        copy.name = preset.builtIn ? preset.name : "\(preset.name) copy"
        copy.builtIn = false
        save(copy)
        return copy
    }

    func export(to url: URL) throws {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        try enc.encode(user).write(to: url, options: .atomic)
    }

    /// Imported presets never overwrite: a clashing id gets a fresh one.
    @discardableResult
    func importPresets(from url: URL) throws -> Int {
        let incoming = try JSONDecoder().decode([Preset].self, from: Data(contentsOf: url))
        for var p in incoming {
            if user.contains(where: { $0.id == p.id }) || builtIn.contains(where: { $0.id == p.id }) {
                p.id = Preset.new(name: "").id
            }
            p.builtIn = false
            user.append(p)
        }
        persist()
        return incoming.count
    }

    private func persist() {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        try? enc.encode(user).write(to: file, options: .atomic)
    }
}
