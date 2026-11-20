import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    var body: some View {
        TabView {
            Tab("General", systemImage: "gearshape") { GeneralSettings() }
            Tab("Playback", systemImage: "play.circle") { PlaybackSettings() }
            Tab("Presets", systemImage: "square.stack.3d.up") { PresetSettings() }
            Tab("Shortcuts", systemImage: "command") { ShortcutSettings() }
            Tab("Paper", systemImage: "paintpalette") { AppearanceSettings() }
            Tab("About", systemImage: "info.circle") { AboutSettings() }
        }
        .frame(width: 560, height: 520)
        .onAppear { DockPolicy.windowOpened() }
        .onDisappear { DockPolicy.windowClosed() }
    }
}

// MARK: - General

private struct GeneralSettings: View {
    @Environment(AppModel.self) private var model
    @AppStorage(PrefKey.showInDock) private var showInDock = false
    @AppStorage(PrefKey.openMixerAtLaunch) private var openMixerAtLaunch = false
    @AppStorage(PrefKey.launchPlayback) private var launchPlayback = LaunchPlayback.restorePaused.rawValue
    @AppStorage(PrefKey.launchPresetID) private var launchPresetID = ""
    @AppStorage(PrefKey.showTimerInMenuBar) private var showTimerInMenuBar = true

    @State private var launchAtLogin = LoginItem.isEnabled
    @State private var loginError: String?

    var body: some View {
        Form {
            Section {
                Toggle("Open Dhvani when you log in", isOn: $launchAtLogin)
                    .onChange(of: launchAtLogin) { _, on in
                        do {
                            try LoginItem.set(on)
                            loginError = nil
                        } catch {
                            loginError = error.localizedDescription
                            launchAtLogin = LoginItem.isEnabled
                        }
                    }
                if LoginItem.needsApproval {
                    LabeledContent("macOS is waiting for you to allow it") {
                        Button("Open Login Items") { LoginItem.openSystemSettings() }
                    }
                }
                if let loginError {
                    Text(loginError).font(.caption).foregroundStyle(.red)
                }

                Picker("When Dhvani opens", selection: $launchPlayback) {
                    ForEach(LaunchPlayback.allCases) { Text($0.label).tag($0.rawValue) }
                }
                if launchPlayback == LaunchPlayback.preset.rawValue {
                    Picker("Preset", selection: $launchPresetID) {
                        Text("Choose…").tag("")
                        ForEach(model.presets.all) { Text($0.name).tag($0.id) }
                    }
                }
                Toggle("Open the mixer window too", isOn: $openMixerAtLaunch)
            } header: {
                Text("Starting up")
            } footer: {
                Text("With “Open when you log in” and “Resume the last mix”, your sound is back on as soon as you sit down.")
            }

            Section("Menu bar and Dock") {
                Toggle("Show the sleep timer countdown in the menu bar", isOn: $showTimerInMenuBar)
                Toggle("Show Dhvani in the Dock", isOn: $showInDock)
                    .onChange(of: showInDock) { _, _ in DockPolicy.apply() }
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Playback

private struct PlaybackSettings: View {
    @AppStorage(PrefKey.pauseOnSleep) private var pauseOnSleep = true
    @AppStorage(PrefKey.resumeOnWake) private var resumeOnWake = false
    @AppStorage(PrefKey.pauseOnLock) private var pauseOnLock = false
    @AppStorage(PrefKey.resumeOnUnlock) private var resumeOnUnlock = true
    @AppStorage(PrefKey.pauseOnHeadphonesUnplugged) private var pauseOnUnplug = true
    @AppStorage(PrefKey.mediaKeys) private var mediaKeys = true
    @AppStorage(PrefKey.timerEndAction) private var timerEndAction = TimerEndAction.pause.rawValue
    @AppStorage(PrefKey.timerFadeSeconds) private var timerFadeSeconds = 30.0
    @Environment(AppModel.self) private var model

    var body: some View {
        Form {
            Section("Getting out of the way") {
                Toggle("Pause when the Mac goes to sleep", isOn: $pauseOnSleep)
                Toggle("Resume when it wakes", isOn: $resumeOnWake)
                    .disabled(!pauseOnSleep)
                    .padding(.leading, 18)
                Toggle("Pause when the screen locks", isOn: $pauseOnLock)
                Toggle("Resume when it unlocks", isOn: $resumeOnUnlock)
                    .disabled(!pauseOnLock)
                    .padding(.leading, 18)
                Toggle("Pause when headphones are disconnected", isOn: $pauseOnUnplug)
            }

            Section {
                Toggle("Use the keyboard's media keys and Control Center", isOn: $mediaKeys)
                    .onChange(of: mediaKeys) { _, on in
                        if on { NowPlayingBridge.shared.start(model) } else { NowPlayingBridge.shared.stop() }
                    }
            } header: {
                Text("Media keys")
            } footer: {
                Text("Play/pause toggles the mix. Next and previous step through your presets.")
            }

            Section("Sleep timer") {
                Picker("When the timer ends", selection: $timerEndAction) {
                    ForEach(TimerEndAction.allCases) { Text($0.label).tag($0.rawValue) }
                }
                LabeledContent("Fade out over") {
                    HStack {
                        Slider(value: $timerFadeSeconds, in: 5...300, step: 5)
                        Text(timerFadeSeconds >= 60 ? "\(Int(timerFadeSeconds / 60))m \(Int(timerFadeSeconds) % 60)s" : "\(Int(timerFadeSeconds))s")
                            .monospacedDigit()
                            .frame(width: 54, alignment: .trailing)
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Presets

private struct PresetSettings: View {
    @Environment(AppModel.self) private var model
    @AppStorage(PrefKey.presetsChangePaper) private var presetsChangePaper = true
    @AppStorage(PrefKey.showBuiltInPresets) private var showBuiltIns = true
    @State private var exporting = false
    @State private var importing = false
    @State private var message: String?

    private var exportData: Data {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        return (try? enc.encode(model.presets.user)) ?? Data("[]".utf8)
    }

    var body: some View {
        Form {
            Section {
                if model.presets.user.isEmpty {
                    Text("You have not saved any presets yet. Build a mix and press “Save mix” in the menu bar.")
                        .foregroundStyle(.secondary)
                } else {
                    List {
                        ForEach(model.presets.user) { p in
                            HStack {
                                Doodle(name: faceOf(p, in: model.catalogue)).frame(width: 20, height: 20)
                                Text(p.name)
                                Spacer()
                                Button("Edit…") {
                                    PresetEditing.shared.request = p
                                    AppActions.openMixer?()
                                }
                                .controlSize(.small)
                                Button(role: .destructive) { model.presets.delete(p.id) } label: { Image(systemName: "trash") }
                                    .buttonStyle(.borderless)
                                    .accessibilityLabel("Delete \(p.name)")
                            }
                        }
                        .onMove { model.presets.move(from: $0, to: $1) }
                    }
                    .frame(minHeight: 120)
                }
                HStack {
                    Button("Import…") { importing = true }
                    Button("Export…") { exporting = true }.disabled(model.presets.user.isEmpty)
                    Spacer()
                    if let message { Text(message).font(.caption).foregroundStyle(.secondary) }
                }
            } header: {
                Text("Your presets")
            } footer: {
                Text("Drag to reorder. The first nine are ⌘1 to ⌘9 in the menu bar.")
            }

            Section("Built in") {
                Toggle("Show the built-in presets in the menu bar", isOn: $showBuiltIns)
                if showBuiltIns {
                    ForEach(model.presets.builtIn) { p in
                        Toggle(isOn: Binding(
                            get: { !model.presets.hiddenBuiltIns.contains(p.id) },
                            set: { on in
                                if on { model.presets.hiddenBuiltIns.remove(p.id) } else { model.presets.hiddenBuiltIns.insert(p.id) }
                            }
                        )) {
                            HStack {
                                Doodle(name: faceOf(p, in: model.catalogue)).frame(width: 18, height: 18)
                                Text("\(p.name)  \(Text(p.blurb).foregroundStyle(.secondary).font(.caption))")
                            }
                        }
                    }
                }
            }

            Section {
                Toggle("Presets also change the paper", isOn: $presetsChangePaper)
            }
        }
        .formStyle(.grouped)
        .fileExporter(isPresented: $exporting, item: PresetsFile(data: exportData), contentTypes: [.json], defaultFilename: "Dhvani presets") { result in
            message = (try? result.get()) != nil ? "Exported \(model.presets.user.count)." : "Export failed."
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            guard let url = try? result.get() else { return }
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                message = "Imported \(try model.presets.importPresets(from: url))."
            } catch {
                message = "That file is not a Dhvani preset export."
            }
        }
    }
}

/// The user's presets as a file, for sharing between Macs or with a friend.
private nonisolated struct PresetsFile: Transferable {
    let data: Data

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .json) { $0.data }
    }
}

// MARK: - Shortcuts

private struct ShortcutSettings: View {
    var body: some View {
        Form {
            Section {
                ForEach(HotKeys.Action.allCases, id: \.rawValue) { action in
                    LabeledContent(action.label) { ShortcutRecorder(action: action) }
                }
            } header: {
                Text("Anywhere on your Mac")
            } footer: {
                Text("These work while any app is in front. Click a shortcut, then press the keys you want.")
            }

            Section("In the menu bar panel") {
                LabeledContent("Play a preset", value: "⌘1 – ⌘9")
                LabeledContent("Open the mixer", value: "⌘M")
                LabeledContent("Settings", value: "⌘,")
            }
            Section("In the mixer") {
                LabeledContent("Play or pause", value: "⌘P")
                LabeledContent("Next / previous preset", value: "⌘] / ⌘[")
                LabeledContent("New key for the music", value: "⌘R")
                LabeledContent("Save the mix as a preset", value: "⌘S")
                LabeledContent("Clear the mix", value: "⇧⌘⌫")
            }
        }
        .formStyle(.grouped)
    }
}

private struct ShortcutRecorder: View {
    let action: HotKeys.Action
    @State private var combo: KeyCombo?
    @State private var recording = false
    @State private var monitor: Any?

    var body: some View {
        HStack(spacing: 6) {
            Button {
                recording ? stop() : start()
            } label: {
                Text(recording ? "Press keys…" : combo?.display ?? "Record")
                    .monospaced()
                    .frame(minWidth: 96)
            }
            .paperGlass()
            if combo != nil {
                Button {
                    combo = nil
                    HotKeys.shared.set(nil, for: action)
                } label: {
                    Image(systemName: "xmark.circle.fill")
                }
                .buttonStyle(.borderless)
                .foregroundStyle(.secondary)
                .accessibilityLabel("Clear shortcut")
            }
        }
        .onAppear { combo = HotKeys.shared.combo(for: action) }
        .onDisappear(perform: stop)
    }

    private func start() {
        recording = true
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            if event.keyCode == 53 { // escape cancels
                stop()
                return nil
            }
            guard let c = KeyCombo(event: event) else { return nil }
            combo = c
            HotKeys.shared.set(c, for: action)
            stop()
            return nil
        }
    }

    private func stop() {
        recording = false
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
    }
}

// MARK: - Appearance

private struct AppearanceSettings: View {
    @Environment(AppModel.self) private var model
    @AppStorage(PrefKey.followSystemAppearance) private var follow = false
    @AppStorage(PrefKey.darkTheme) private var darkTheme = "sumi"

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 14) {
                    PaperSwatches(size: 34)
                    let t = model.theme
                    HStack(alignment: .firstTextBaseline) {
                        Text(t.name).font(.hand(24, weight: .semibold))
                        Text(t.jp).foregroundStyle(Color(hex: t.colors.accentText))
                        Text(t.mood).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 6)
            } header: {
                Text("Paper")
            } footer: {
                Text("Every paper is a traditional Japanese colour, as on the site.")
            }
            Section("Dark mode") {
                Toggle("Switch paper when macOS is in dark mode", isOn: $follow)
                if follow {
                    Picker("Dark paper", selection: $darkTheme) {
                        ForEach(model.catalogue.themes) { Text("\($0.name) \($0.jp)").tag($0.id) }
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - About

private struct AboutSettings: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper

    var body: some View {
        Form {
            Section {
                VStack(spacing: 10) {
                    Image("Logo").renderingMode(.template).resizable().scaledToFit().frame(height: 64)
                        .foregroundStyle(paper.ink)
                    Text("A hand drawn noise machine that never loops.").font(.hand(20))
                    Text("Version \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0")")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("57 ambiences synthesised live, 27 public domain field recordings, and a generative music deck that writes lofi and nocturnes one bar at a time. The synthesis is the same code the website runs.")
                        .font(.callout)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Link("dhvani on the web", destination: URL(string: "https://eeman1113.github.io/Dhvani/")!)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
            Section {
                VStack(alignment: .leading, spacing: 2) {
                    Link(destination: URL(string: "https://github.com/Eeman1113")!) {
                        Text("Dhvani is made by **Eeman Majumder**")
                    }
                    Text("The synthesis, the generative music, the drawing system and everything else here, except where noted below.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                HStack(alignment: .top, spacing: 12) {
                    Image("Logo").renderingMode(.template).resizable().scaledToFit().frame(height: 30)
                        .foregroundStyle(paper.ink)
                    VStack(alignment: .leading, spacing: 2) {
                        Link(destination: URL(string: "https://www.linkedin.com/in/sakshi-sawarkar/")!) {
                            Text("Logo by **Sakshi Sawarkar**")
                        }
                        Text("The word ध्वनि in her own handwriting, written in felt tip on a sheet of paper, photographed, cut out of its background and traced to vector. The waver in the shirorekha is hers, and not a letterform has been corrected.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("Who made it 作")
            }
            Section {
                ForEach(model.catalogue.credits) { c in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(model.catalogue.sounds.first { $0.credit == c.id }?.name ?? c.title).font(.body)
                        HStack(spacing: 6) {
                            Text("by \(c.author)")
                            Link(c.license, destination: URL(string: c.licenseUrl)!)
                            Link("source", destination: URL(string: c.sourceUrl)!)
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("The recordings 録, and who to thank")
            } footer: {
                Text("Fonts: Caveat and Zen Maru Gothic, under the SIL Open Font License.")
            }
        }
        .formStyle(.grouped)
    }
}
