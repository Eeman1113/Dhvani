import SwiftUI

@main
struct DhvaniApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model: AppModel

    init() {
        // Before any view asks for Caveat or Zen Maru Gothic.
        Fonts.register()
        _model = State(initialValue: AppModel.shared)
    }

    var body: some Scene {
        MenuBarExtra {
            MenuBarPanel()
                .paperRoot()
                .environment(model)
        } label: {
            MenuBarLabel()
                .environment(model)
        }
        .menuBarExtraStyle(.window)

        Window("Dhvani", id: "mixer") {
            MixerWindow()
                .paperRoot()
                .environment(model)
        }
        .defaultSize(width: 1100, height: 760)
        .defaultLaunchBehavior(.suppressed)
        .windowToolbarStyle(.unified)
        .commands { DhvaniCommands(model: model) }

        Settings {
            SettingsView()
                .paperRoot()
                .environment(model)
        }

        #if DEBUG
        // The menu bar panel in an ordinary window, so it can be screenshotted
        // and inspected. Opened by launching with DHVANI_PANEL_PREVIEW=1
        // (and DHVANI_MIXER=1 opens the mixer).
        Window("Panel preview", id: "panel-preview") {
            MenuBarPanel()
                .paperRoot()
                .environment(model)
                .background(.regularMaterial)
        }
        .windowResizability(.contentSize)
        .defaultLaunchBehavior(.suppressed)
        #endif
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var events: SystemEvents?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let model = AppModel.shared
        DockPolicy.apply()

        events = SystemEvents(model: model)
        events?.start()
        NowPlayingBridge.shared.start(model)

        HotKeys.shared.handler = { action in
            switch action {
            case .toggle: model.togglePlay()
            case .nextPreset: model.nextPreset()
            case .mixer: AppActions.openMixer?()
            }
        }
        HotKeys.shared.registerAll()
    }

    /// Clicking the Dock icon (when it is shown) opens the mixer.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool {
        if !hasVisibleWindows { AppActions.openMixer?() }
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        AppModel.shared.save()
    }
}

struct DhvaniCommands: Commands {
    let model: AppModel

    var body: some Commands {
        CommandMenu("Playback") {
            Button(model.isPlaying ? "Pause" : "Play") { model.togglePlay() }
                .keyboardShortcut("p")
            Button("Next Preset") { model.nextPreset(1) }
                .keyboardShortcut("]")
            Button("Previous Preset") { model.nextPreset(-1) }
                .keyboardShortcut("[")
            Button("New Key for the Music") { model.rerollMusic() }
                .keyboardShortcut("r")
                .disabled(model.music == nil)
            Divider()
            Menu("Sleep Timer") {
                ForEach(timerOptions, id: \.self) { m in
                    Button(timerLabel(m)) { model.setTimer(minutes: m) }
                }
                Divider()
                Button("Cancel Timer") { model.setTimer(minutes: nil) }
                    .disabled(model.timerEndsAt == nil)
            }
            Divider()
            Button("Clear the Mix") { model.clear() }
                .keyboardShortcut(.delete, modifiers: [.command, .shift])
                .disabled(!model.hasMix)
        }
        CommandMenu("Presets") {
            Button("Save Mix as Preset…") {
                PresetEditing.shared.request = model.snapshot(name: "")
            }
            .keyboardShortcut("s")
            .disabled(!model.hasMix)
            Divider()
            ForEach(Array(model.presets.visible.enumerated()), id: \.element.id) { i, p in
                if i < 9 {
                    Button(p.name) { model.apply(p) }
                        .keyboardShortcut(KeyEquivalent(Character("\(i + 1)")))
                } else {
                    Button(p.name) { model.apply(p) }
                }
            }
        }
    }
}
