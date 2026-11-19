import AppKit
import CoreText
import SwiftUI

/// One of the site's six papers, as SwiftUI colours.
///
/// The site is a sheet of tinted paper with ink on it. The app keeps the
/// paper and the ink, and lets Liquid Glass stand in for the card stock, so
/// it reads as the same object made for macOS rather than a web page in a box.
struct Paper: Equatable {
    let id: String
    let dark: Bool
    let paper, paper2, paper3, ink, inkSoft, line, accent, accentText, accent2, wash: Color

    init(_ t: PaperTheme) {
        let c = t.colors
        id = t.id
        dark = t.dark
        paper = Color(hex: c.paper)
        paper2 = Color(hex: c.paper2)
        paper3 = Color(hex: c.paper3)
        ink = Color(hex: c.ink)
        inkSoft = Color(hex: c.inkSoft)
        line = Color(hex: c.line)
        accent = Color(hex: c.accent)
        accentText = Color(hex: c.accentText)
        accent2 = Color(hex: c.accent2)
        wash = Color(hex: c.wash)
    }

    var colorScheme: ColorScheme { dark ? .dark : .light }
}

private struct PaperKey: EnvironmentKey {
    static let defaultValue = Paper(PaperTheme(
        id: "kinari", name: "Kinari", jp: "生成", mood: "", dark: false,
        colors: .init(paper: "#f7f2e7", paper2: "#f2e9d6", paper3: "#eddfc1", ink: "#423a2e", inkSoft: "#645b4f",
                      line: "#e4d5b3", accent: "#bb9a63", accentText: "#725a32", accent2: "#a8886f", wash: "#e3daca")
    ))
}

extension EnvironmentValues {
    var paper: Paper {
        get { self[PaperKey.self] }
        set { self[PaperKey.self] = newValue }
    }
}

extension Color {
    init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))).scanHexInt64(&v)
        self.init(
            .sRGB,
            red: Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8) & 0xFF) / 255,
            blue: Double(v & 0xFF) / 255
        )
    }
}

/// Puts the current paper in the environment. With "follow system
/// appearance" on, a dark Mac swaps the chosen paper for the dark one.
struct PaperRoot: ViewModifier {
    @Environment(AppModel.self) private var model
    @Environment(\.colorScheme) private var scheme
    @AppStorage(PrefKey.followSystemAppearance) private var follow = false
    @AppStorage(PrefKey.darkTheme) private var darkTheme = "sumi"

    func body(content: Content) -> some View {
        let id = follow && scheme == .dark ? darkTheme : model.themeID
        let paper = Paper(model.catalogue.theme(id))
        content
            .environment(\.paper, paper)
            // Native controls and glass follow the paper, not the system: a
            // light slider on Sumi's midnight stock would glare.
            .environment(\.colorScheme, paper.colorScheme)
            .tint(paper.accent)
    }
}

extension View {
    func paperRoot() -> some View { modifier(PaperRoot()) }
}

// MARK: - type

/// The site's two faces: Caveat for anything hand-lettered, Zen Maru Gothic
/// for reading. Both ship in the bundle and are registered at launch.
enum Fonts {
    static func register() {
        guard let dir = Bundle.main.url(forResource: "Fonts", withExtension: nil),
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
        else { return }
        let fonts = files.filter { $0.pathExtension == "ttf" } as CFArray
        CTFontManagerRegisterFontURLs(fonts, .process, true, nil)
    }
}

extension Font {
    /// Caveat. Hand-lettered headings, preset names, small notes.
    static func hand(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Caveat", size: size).weight(weight)
    }

    /// Zen Maru Gothic. Everything that has to be read.
    static func zen(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .bold, .heavy, .black, .semibold: .custom("ZenMaruGothic-Bold", size: size)
        case .medium: .custom("ZenMaruGothic-Medium", size: size)
        default: .custom("ZenMaruGothic-Regular", size: size)
        }
    }
}
