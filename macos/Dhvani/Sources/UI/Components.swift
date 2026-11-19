import SwiftUI

/// One of the site's doodles, stilled and tinted with the paper's ink.
struct Doodle: View {
    @Environment(\.paper) private var paper
    var name: String
    var active = false

    var body: some View {
        Image("Doodles/\(name)")
            .renderingMode(.template)
            .resizable()
            .interpolation(.high)
            .scaledToFit()
            .foregroundStyle(active ? paper.accentText : paper.ink)
            .opacity(active ? 1 : 0.72)
            .accessibilityHidden(true)
    }
}

/// The site's card, made of glass: a Liquid Glass body tinted with the paper,
/// and the same hand-inked outline drawn over it.
struct InkCard: ViewModifier {
    @Environment(\.paper) private var paper
    var key: String
    var radius: Double = 16
    var active = false
    var interactive = false

    func body(content: Content) -> some View {
        // Active cards take on the accent, the way a lit card does on the site.
        let tint = active ? paper.accent.opacity(paper.dark ? 0.32 : 0.24) : paper.paper2.opacity(0.45)
        content
            .glassEffect(
                interactive ? .regular.tint(tint).interactive() : .regular.tint(tint),
                in: .rect(cornerRadius: radius)
            )
            .overlay {
                RoughBorder(
                    key: key,
                    radius: radius,
                    lineWidth: active ? 2.0 : 1.5,
                    color: active ? paper.accent : paper.ink,
                    opacity: active ? 0.95 : 0.55
                )
            }
    }
}

extension View {
    func inkCard(_ key: String, radius: Double = 16, active: Bool = false, interactive: Bool = false) -> some View {
        modifier(InkCard(key: key, radius: radius, active: active, interactive: interactive))
    }
}

/// "Start somewhere 下地 a mix already made…": a hand-lettered title, its
/// Japanese gloss in the accent, and a quiet line of explanation.
struct SectionHeader: View {
    @Environment(\.paper) private var paper
    var title: String
    var jp: String
    var gloss: String?
    var size: CGFloat = 22

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(title).font(.hand(size, weight: .semibold)).foregroundStyle(paper.ink)
            Text(jp).font(.zen(size * 0.55)).foregroundStyle(paper.accentText)
            if let gloss {
                Text(gloss).font(.zen(11.5)).foregroundStyle(paper.inkSoft).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

/// The face of a preset: its chosen doodle, or the loudest thing in it.
func faceOf(_ preset: Preset, in catalogue: Catalogue) -> String {
    if let icon = preset.icon { return icon }
    if let top = preset.mix.max(by: { $0.value < $1.value }), let s = catalogue.sound(top.key) { return s.doodle }
    return preset.music?.mode.doodle ?? "rain"
}

/// Everything behind the window: paper, and the site's painted mountains in
/// mist, graded for the paper and faded well back. Glass needs something
/// behind it to be glass about.
struct PaperBackdrop: View {
    @Environment(\.paper) private var paper

    var body: some View {
        ZStack {
            paper.paper
            GeometryReader { geo in
                ZStack(alignment: .bottom) {
                    art("mist-2").frame(width: geo.size.width * 1.1).offset(x: -geo.size.width * 0.2, y: -geo.size.height * 0.35).opacity(0.35)
                    art("enso").frame(width: min(geo.size.width, geo.size.height) * 0.7).offset(x: geo.size.width * 0.3, y: -geo.size.height * 0.3).opacity(0.10)
                    art("mountains").frame(width: geo.size.width * 1.05).opacity(paper.dark ? 0.22 : 0.4)
                }
                .frame(width: geo.size.width, height: geo.size.height, alignment: .bottom)
            }
            .blendMode(paper.dark ? .screen : .multiply)
            .saturation(0.6)
        }
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.9), value: paper.id)
    }

    @ViewBuilder
    private func art(_ name: String) -> some View {
        if let url = Bundle.main.url(forResource: name, withExtension: "webp", subdirectory: "art"),
           let image = NSImage(contentsOf: url) {
            Image(nsImage: image).resizable().scaledToFit()
        }
    }
}

/// The six papers as inked circles, like the site's swatches.
struct PaperSwatches: View {
    @Environment(AppModel.self) private var model
    var size: CGFloat = 22

    var body: some View {
        HStack(spacing: 6) {
            ForEach(model.catalogue.themes) { t in
                let on = t.id == model.themeID
                Button {
                    withAnimation(.easeInOut(duration: 0.6)) { model.themeID = t.id }
                } label: {
                    ZStack {
                        Circle().fill(Color(hex: t.colors.paper))
                        RoughCircle(seed: Rough.hash("sw-\(t.id)"))
                            .stroke(Color(hex: on ? t.colors.accent : t.colors.line), lineWidth: on ? 2.4 : 1.6)
                        Circle().fill(Color(hex: t.colors.accent)).padding(size * 0.3).opacity(on ? 1 : 0.6)
                    }
                    .frame(width: size, height: size)
                    .scaleEffect(on ? 1.12 : 1)
                }
                .buttonStyle(.plain)
                .help("\(t.name) \(t.jp), \(t.mood)")
                .accessibilityLabel("\(t.name) paper")
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}

let timerOptions = [15, 25, 50, 90, 180, 480]

func timerLabel(_ minutes: Int) -> String {
    minutes < 60 ? "\(minutes) minutes" : minutes == 60 ? "1 hour" : "\(minutes / 60) hours"
}

func countdown(_ t: TimeInterval) -> String {
    let s = Int(t.rounded(.up))
    if s >= 3600 { return "\(s / 3600)h \((s % 3600) / 60)m" }
    if s >= 60 { return "\(Int((Double(s) / 60).rounded(.up)))m" }
    return "\(s)s"
}

/// The sleep timer, as a native menu.
struct TimerMenu: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    var compact = false

    var body: some View {
        Menu {
            Section("Fade out and stop after") {
                ForEach(timerOptions, id: \.self) { m in
                    Button(timerLabel(m)) { model.setTimer(minutes: m) }
                }
            }
            if model.timerEndsAt != nil {
                Divider()
                Button("Cancel timer", role: .destructive) { model.setTimer(minutes: nil) }
            }
        } label: {
            if let left = model.timerRemaining {
                Label(countdown(left), systemImage: "moon.zzz.fill")
                    .monospacedDigit()
            } else {
                Label(compact ? "Timer" : "Sleep timer", systemImage: "moon.zzz")
            }
        }
        .menuIndicator(.hidden)
        .help(model.timerRemaining.map { "Sleep timer: \(countdown($0)) left" } ?? "Set a sleep timer")
    }
}

/// A fader with the paper's accent and a readable value for VoiceOver.
struct LevelSlider: View {
    var value: Double
    var label: String
    var onChange: @MainActor @Sendable (Double) -> Void

    var body: some View {
        // The closure is wrapped rather than passed straight to `set:`.
        //
        // Handing Binding a bare `@MainActor @Sendable (Double) -> Void`
        // makes the compiler build an @isolated(any) reabstraction thunk,
        // and swift-frontend 6.2 crashes emitting IR for it, in both Debug
        // and Release. Calling it from inside a closure is the same thing
        // semantically and gives the compiler nothing to reabstract.
        Slider(value: Binding(get: { value }, set: { onChange($0) }), in: 0...1)
            .controlSize(.small)
            .accessibilityLabel(label)
            .accessibilityValue("\(Int(value * 100)) percent")
    }
}

/// Secondary buttons are glass the colour of the paper. Only the one thing
/// that matters on a surface (play, save) gets the accent.
struct PaperGlassButton: ViewModifier {
    @Environment(\.paper) private var paper
    func body(content: Content) -> some View {
        content
            .buttonStyle(.glass)
            .tint(paper.paper3.opacity(0.7))
            .foregroundStyle(paper.ink)
    }
}

extension View {
    func paperGlass() -> some View { modifier(PaperGlassButton()) }
}
