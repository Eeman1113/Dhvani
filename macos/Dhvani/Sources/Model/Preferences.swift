import Foundation

/// Every setting, by key. Views bind to these with @AppStorage; the model
/// reads them through `Prefs` so both always agree on the key and default.
enum PrefKey {
    static let showInDock = "showInDock"
    static let openMixerAtLaunch = "openMixerAtLaunch"
    static let launchPlayback = "launchPlayback"
    static let launchPresetID = "launchPresetID"
    static let pauseOnSleep = "pauseOnSleep"
    static let resumeOnWake = "resumeOnWake"
    static let pauseOnLock = "pauseOnLock"
    static let resumeOnUnlock = "resumeOnUnlock"
    static let pauseOnHeadphonesUnplugged = "pauseOnHeadphonesUnplugged"
    static let mediaKeys = "mediaKeys"
    static let followSystemAppearance = "followSystemAppearance"
    static let darkTheme = "darkTheme"
    static let presetsChangePaper = "presetsChangePaper"
    static let timerEndAction = "timerEndAction"
    static let timerFadeSeconds = "timerFadeSeconds"
    static let showTimerInMenuBar = "showTimerInMenuBar"
    static let showBuiltInPresets = "showBuiltInPresets"
    static let hotkeyToggle = "hotkey.toggle"
    static let hotkeyNextPreset = "hotkey.nextPreset"
    static let hotkeyMixer = "hotkey.mixer"
}

enum LaunchPlayback: String, CaseIterable, Identifiable {
    /// Bring back the last mix and start playing it.
    case resume
    /// Bring back the last mix, paused.
    case restorePaused
    /// Start a chosen preset.
    case preset
    /// Start with nothing.
    case silent

    var id: String { rawValue }
    var label: String {
        switch self {
        case .resume: "Resume the last mix"
        case .restorePaused: "Restore the last mix, paused"
        case .preset: "Play a preset"
        case .silent: "Start silent"
        }
    }
}

enum TimerEndAction: String, CaseIterable, Identifiable {
    case pause, clear, quit
    var id: String { rawValue }
    var label: String {
        switch self {
        case .pause: "Pause, keeping the mix"
        case .clear: "Stop and clear the mix"
        case .quit: "Quit Dhvani"
        }
    }
}

enum Prefs {
    static func register() {
        UserDefaults.standard.register(defaults: [
            PrefKey.showInDock: false,
            PrefKey.openMixerAtLaunch: false,
            PrefKey.launchPlayback: LaunchPlayback.restorePaused.rawValue,
            PrefKey.pauseOnSleep: true,
            PrefKey.resumeOnWake: false,
            PrefKey.pauseOnLock: false,
            PrefKey.resumeOnUnlock: true,
            PrefKey.pauseOnHeadphonesUnplugged: true,
            PrefKey.mediaKeys: true,
            PrefKey.followSystemAppearance: false,
            PrefKey.darkTheme: "sumi",
            PrefKey.presetsChangePaper: true,
            PrefKey.timerEndAction: TimerEndAction.pause.rawValue,
            PrefKey.timerFadeSeconds: 30.0,
            PrefKey.showTimerInMenuBar: true,
            PrefKey.showBuiltInPresets: true,
        ])
    }

    private static var d: UserDefaults { .standard }
    static var showInDock: Bool { d.bool(forKey: PrefKey.showInDock) }
    static var openMixerAtLaunch: Bool { d.bool(forKey: PrefKey.openMixerAtLaunch) }
    static var launchPlayback: LaunchPlayback { LaunchPlayback(rawValue: d.string(forKey: PrefKey.launchPlayback) ?? "") ?? .restorePaused }
    static var launchPresetID: String? { d.string(forKey: PrefKey.launchPresetID) }
    static var pauseOnSleep: Bool { d.bool(forKey: PrefKey.pauseOnSleep) }
    static var resumeOnWake: Bool { d.bool(forKey: PrefKey.resumeOnWake) }
    static var pauseOnLock: Bool { d.bool(forKey: PrefKey.pauseOnLock) }
    static var resumeOnUnlock: Bool { d.bool(forKey: PrefKey.resumeOnUnlock) }
    static var pauseOnHeadphonesUnplugged: Bool { d.bool(forKey: PrefKey.pauseOnHeadphonesUnplugged) }
    static var mediaKeys: Bool { d.bool(forKey: PrefKey.mediaKeys) }
    static var presetsChangePaper: Bool { d.bool(forKey: PrefKey.presetsChangePaper) }
    static var timerEndAction: TimerEndAction { TimerEndAction(rawValue: d.string(forKey: PrefKey.timerEndAction) ?? "") ?? .pause }
    static var timerFadeSeconds: Double { d.double(forKey: PrefKey.timerFadeSeconds) }
}
