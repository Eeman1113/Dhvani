import AppIntents

/// Dhvani's presets and transport, for Shortcuts, Spotlight and Siri:
/// "Play Deep Work in Dhvani", or a Focus that starts a mix.
struct PresetEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Dhvani Preset"
    static let defaultQuery = PresetQuery()

    let id: String
    let name: String
    let blurb: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: blurb.isEmpty ? nil : "\(blurb)")
    }

    init(_ p: Preset) {
        id = p.id
        name = p.name
        blurb = p.blurb
    }
}

struct PresetQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [PresetEntity] {
        await MainActor.run { AppModel.shared.presets.all.filter { identifiers.contains($0.id) }.map(PresetEntity.init) }
    }

    func entities(matching string: String) async throws -> [PresetEntity] {
        await MainActor.run {
            AppModel.shared.presets.all
                .filter { $0.name.localizedCaseInsensitiveContains(string) }
                .map(PresetEntity.init)
        }
    }

    func suggestedEntities() async throws -> [PresetEntity] {
        await MainActor.run { AppModel.shared.presets.visible.map(PresetEntity.init) }
    }
}

struct PlayPresetIntent: AppIntent {
    static let title: LocalizedStringResource = "Play Preset"
    static let description = IntentDescription("Replaces the mix with one of your Dhvani presets.")

    @Parameter(title: "Preset") var preset: PresetEntity

    func perform() async throws -> some IntentResult {
        let id = preset.id
        await MainActor.run {
            let model = AppModel.shared
            if let p = model.presets.preset(id) { model.apply(p) }
        }
        return .result()
    }
}

struct TogglePlaybackIntent: AppIntent {
    static let title: LocalizedStringResource = "Play or Pause"
    static let description = IntentDescription("Pauses Dhvani if it is playing, and plays it if it is not.")

    func perform() async throws -> some IntentResult {
        await MainActor.run { AppModel.shared.togglePlay() }
        return .result()
    }
}

struct PauseIntent: AppIntent {
    static let title: LocalizedStringResource = "Pause"

    func perform() async throws -> some IntentResult {
        await MainActor.run { AppModel.shared.pause() }
        return .result()
    }
}

struct SleepTimerIntent: AppIntent {
    static let title: LocalizedStringResource = "Set Sleep Timer"
    static let description = IntentDescription("Fades Dhvani out after the given number of minutes.")

    @Parameter(title: "Minutes", default: 50, inclusiveRange: (1, 720)) var minutes: Int

    func perform() async throws -> some IntentResult {
        let m = minutes
        await MainActor.run { AppModel.shared.setTimer(minutes: m) }
        return .result()
    }
}

struct DhvaniShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PlayPresetIntent(),
            phrases: ["Play \(\.$preset) in \(.applicationName)", "Start \(\.$preset) in \(.applicationName)"],
            shortTitle: "Play Preset",
            systemImageName: "square.stack.3d.up"
        )
        AppShortcut(
            intent: TogglePlaybackIntent(),
            phrases: ["Play or pause \(.applicationName)", "Toggle \(.applicationName)"],
            shortTitle: "Play or Pause",
            systemImageName: "playpause"
        )
        AppShortcut(
            intent: SleepTimerIntent(),
            phrases: ["Set a sleep timer in \(.applicationName)"],
            shortTitle: "Sleep Timer",
            systemImageName: "moon.zzz"
        )
    }
}
