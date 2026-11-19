import SwiftUI

/// Hooks for things only a view can do (opening a window) that something
/// outside the view tree (a global hotkey, the Dock icon) needs to trigger.
enum AppActions {
    static var openMixer: (() -> Void)?
    static var openSettings: (() -> Void)?
}

/// What lives in the menu bar: the logo, and the sleep timer counting down
/// beside it when one is running.
struct MenuBarLabel: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openWindow) private var openWindow
    @Environment(\.openSettings) private var openSettings
    @AppStorage(PrefKey.showTimerInMenuBar) private var showTimer = true

    var body: some View {
        HStack(spacing: 4) {
            Image(nsImage: StatusIcon.image(playing: model.isPlaying))
            if showTimer, let left = model.timerRemaining {
                Text(countdown(left)).monospacedDigit()
            }
        }
        .help("Dhvani — \(model.isPlaying ? model.summary : "paused")")
        .task {
            // The label is the one view that exists from launch, so it is
            // where the window-opening actions get wired up.
            AppActions.openMixer = {
                openWindow(id: "mixer")
                NSApp.activate()
            }
            AppActions.openSettings = {
                openSettings()
                NSApp.activate()
            }
            if Prefs.openMixerAtLaunch { AppActions.openMixer?() }
            #if DEBUG
            let env = ProcessInfo.processInfo.environment
            if env["DHVANI_PANEL_PREVIEW"] != nil {
                openWindow(id: "panel-preview")
                NSApp.activate()
            }
            if env["DHVANI_MIXER"] != nil { AppActions.openMixer?() }
            if env["DHVANI_SETTINGS"] != nil { AppActions.openSettings?() }
            #endif
        }
    }
}

/// The logo, sized for the menu bar, drawn as a template so it follows the
/// menu bar's own colour. Paused, it is drawn at half strength.
enum StatusIcon {
    private static var cache: [Bool: NSImage] = [:]

    static func image(playing: Bool) -> NSImage {
        if let hit = cache[playing] { return hit }
        let src = NSImage(named: "Logo") ?? NSImage()
        let h: CGFloat = 15
        let w = src.size.height > 0 ? (src.size.width / src.size.height * h).rounded() : h
        let img = NSImage(size: NSSize(width: w, height: h), flipped: false) { rect in
            src.draw(in: rect, from: .zero, operation: .sourceOver, fraction: playing ? 1 : 0.5)
            return true
        }
        img.isTemplate = true
        img.accessibilityDescription = "Dhvani"
        cache[playing] = img
        return img
    }
}

struct MenuBarPanel: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    @AppStorage(PrefKey.showBuiltInPresets) private var showBuiltIns = true

    @State private var showAllPresets = false
    @State private var saving = false
    @State private var newName = ""
    @State private var search = ""
    @FocusState private var nameFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            header
            presetsSection
            musicSection
            playingSection
            footer
        }
        .padding(16)
        .frame(width: 372)
        // Mostly paper, a little glass: the system's own glass behind the
        // panel is grey in dark mode, and the paper has to win.
        .background(PaperBackdrop().opacity(0.9))
        .foregroundStyle(paper.ink)
    }

    // MARK: header

    private var header: some View {
        VStack(spacing: 12) {
            HStack(alignment: .center, spacing: 10) {
                Image("Logo")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 30)
                    .foregroundStyle(paper.ink)
                    .accessibilityLabel("Dhvani")
                VStack(alignment: .leading, spacing: 0) {
                    Text(model.isPlaying ? model.summary : model.hasMix ? "Paused" : "Silence")
                        .font(.hand(17, weight: .semibold))
                        .lineLimit(1)
                    if let np = model.nowPlaying, model.music != nil {
                        Text("\(np.key) · \(Int(np.bpm)) bpm · bar \(np.bar)")
                            .font(.zen(10.5))
                            .foregroundStyle(paper.inkSoft)
                            .monospacedDigit()
                    } else {
                        Text(model.hasMix ? "\(model.activeSounds.count) sound\(model.activeSounds.count == 1 ? "" : "s")\(model.music != nil ? " and music" : "")" : "pick a preset to begin")
                            .font(.zen(10.5))
                            .foregroundStyle(paper.inkSoft)
                    }
                }
                Spacer(minLength: 0)
                TimerMenu(compact: true)
                    .labelStyle(.iconOnly)
                    .fixedSize()
                    .paperGlass()
                    .overlay(alignment: .bottom) {
                        if let left = model.timerRemaining {
                            Text(countdown(left)).font(.zen(8.5)).monospacedDigit().foregroundStyle(paper.accentText).offset(y: 12)
                        }
                    }
                Button {
                    withAnimation(.snappy) { model.togglePlay() }
                } label: {
                    Image(systemName: model.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .frame(width: 30, height: 30)
                        .contentTransition(.symbolEffect(.replace))
                }
                .buttonStyle(.glassProminent)
                .buttonBorderShape(.circle)
                .help(model.isPlaying ? "Pause" : "Play")
                .accessibilityLabel(model.isPlaying ? "Pause" : "Play")
            }

            HStack(spacing: 8) {
                Image(systemName: "speaker.fill").font(.system(size: 10)).foregroundStyle(paper.inkSoft)
                LevelSlider(value: model.master, label: "Master volume") { model.setMaster($0) }
                Image(systemName: "speaker.wave.3.fill").font(.system(size: 10)).foregroundStyle(paper.inkSoft)
            }
        }
    }

    // MARK: presets

    private var presets: [Preset] {
        showBuiltIns ? model.presets.visible : model.presets.user
    }

    private var presetsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionHeader(title: "Presets", jp: "下地", size: 21)
                Button {
                    withAnimation(.snappy) {
                        saving.toggle()
                        newName = ""
                    }
                    if saving { nameFocused = true }
                } label: {
                    Label("Save mix", systemImage: saving ? "xmark" : "plus")
                        .font(.zen(11, weight: .medium))
                }
                .paperGlass()
                .controlSize(.small)
                .disabled(!model.hasMix && !saving)
                .help("Save what is playing now as a preset")
            }

            if saving {
                HStack(spacing: 6) {
                    TextField("Name this mix", text: $newName)
                        .textFieldStyle(.roundedBorder)
                        .focused($nameFocused)
                        .onSubmit(saveNew)
                    Button("Save", action: saveNew)
                        .buttonStyle(.glassProminent)
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            if presets.isEmpty {
                Text("No presets yet. Build a mix, then save it here.")
                    .font(.zen(11)).foregroundStyle(paper.inkSoft)
            } else {
                let shown = showAllPresets ? presets : Array(presets.prefix(6))
                GlassEffectContainer(spacing: 8) {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                        ForEach(Array(shown.enumerated()), id: \.element.id) { i, p in
                            PresetChip(preset: p, shortcut: i < 9 ? i + 1 : nil)
                        }
                    }
                }
                if presets.count > 6 {
                    Button(showAllPresets ? "fewer" : "\(presets.count - 6) more ways in") {
                        withAnimation(.snappy) { showAllPresets.toggle() }
                    }
                    .buttonStyle(.plain)
                    .font(.hand(15))
                    .foregroundStyle(paper.accentText)
                }
            }
        }
    }

    private func saveNew() {
        let name = newName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        let p = model.snapshot(name: name)
        model.presets.save(p)
        model.apply(p)
        withAnimation(.snappy) { saving = false }
    }

    // MARK: music

    private var musicSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionHeader(title: "Music", jp: "音楽", size: 21)
                if model.music != nil {
                    Button {
                        model.rerollMusic()
                    } label: {
                        Label("New key", systemImage: "shuffle").font(.zen(11, weight: .medium))
                    }
                    .paperGlass()
                    .controlSize(.small)
                    .help("Jump to a fresh key and progression")
                }
            }
            GlassEffectContainer(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach(MusicMode.allCases) { mode in
                        let on = model.music?.mode == mode
                        Button {
                            withAnimation(.snappy) { model.setMusicMode(on ? nil : mode) }
                        } label: {
                            HStack(spacing: 8) {
                                Doodle(name: mode.doodle, active: on).frame(width: 26, height: 26)
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(mode.name).font(.hand(17, weight: .semibold))
                                    Text(mode.jp).font(.zen(9)).foregroundStyle(paper.accentText)
                                }
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        .inkCard("menu-music-\(mode.rawValue)", radius: 14, active: on, interactive: true)
                        .accessibilityAddTraits(on ? .isSelected : [])
                        .help(mode.blurb)
                    }
                }
            }
            if let m = model.music {
                LevelSlider(value: m.level, label: "Music level") { model.setMusicLevel($0) }
                    .padding(.horizontal, 4)
            }
        }
    }

    // MARK: playing

    private var results: [Sound] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        let groups = Dictionary(uniqueKeysWithValues: model.catalogue.groups.map { ($0.id, $0.name.lowercased()) })
        return model.catalogue.sounds.filter {
            $0.name.lowercased().contains(q) || $0.jp.contains(q) || (groups[$0.group] ?? "").contains(q)
        }
        .prefix(6)
        .map { $0 }
    }

    private var playingSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionHeader(title: "Playing", jp: "今", size: 21)
                if model.hasMix {
                    Button("Clear", role: .destructive) { withAnimation(.snappy) { model.clear() } }
                        .paperGlass()
                        .controlSize(.small)
                        .font(.zen(11, weight: .medium))
                }
            }

            if model.activeSounds.isEmpty {
                Text("Nothing in the mix. Choose a preset, or add a sound below.")
                    .font(.zen(11)).foregroundStyle(paper.inkSoft)
            } else {
                ScrollView {
                    VStack(spacing: 2) {
                        ForEach(model.activeSounds) { s in
                            ActiveRow(sound: s)
                        }
                    }
                }
                .frame(height: min(CGFloat(model.activeSounds.count) * 36, 216))
                .scrollIndicators(.automatic)
            }

            HStack(spacing: 6) {
                Image(systemName: "plus.magnifyingglass").foregroundStyle(paper.inkSoft)
                TextField("Add a sound: rain, fire, cafe…", text: $search)
                    .textFieldStyle(.plain)
                    .font(.zen(12))
                    .onSubmit {
                        if let first = results.first { add(first) }
                    }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .glassEffect(.regular.tint(paper.paper2.opacity(0.4)), in: .capsule)

            if !results.isEmpty {
                VStack(spacing: 2) {
                    ForEach(results) { s in
                        Button { add(s) } label: {
                            HStack(spacing: 8) {
                                Doodle(name: s.doodle, active: model.levels[s.id] != nil).frame(width: 22, height: 22)
                                Text(s.name).font(.zen(12))
                                if s.isRecording { Text("録").font(.zen(9)).foregroundStyle(paper.accentText) }
                                Spacer()
                                Text(model.catalogue.groups.first { $0.id == s.group }?.jp ?? "").font(.zen(10)).foregroundStyle(paper.inkSoft)
                                Image(systemName: model.levels[s.id] != nil ? "checkmark" : "plus").font(.system(size: 10, weight: .semibold)).foregroundStyle(paper.accentText)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func add(_ s: Sound) {
        if model.levels[s.id] == nil { model.setLevel(s.id, s.defaultLevel) }
        search = ""
    }

    // MARK: footer

    private var footer: some View {
        HStack(spacing: 8) {
            Button {
                AppActions.openMixer?()
            } label: {
                Label("Open Mixer", systemImage: "slider.horizontal.3")
            }
            .paperGlass()
            .keyboardShortcut("m", modifiers: .command)

            PaperSwatches(size: 16)
                .frame(maxWidth: .infinity)

            Button {
                AppActions.openSettings?()
            } label: {
                Image(systemName: "gearshape")
            }
            .paperGlass()
            .buttonBorderShape(.circle)
            .keyboardShortcut(",", modifiers: .command)
            .help("Settings")

            Button {
                model.save()
                NSApp.terminate(nil)
            } label: {
                Image(systemName: "power")
            }
            .paperGlass()
            .buttonBorderShape(.circle)
            .keyboardShortcut("q", modifiers: .command)
            .help("Quit Dhvani")
        }
        .font(.zen(11.5, weight: .medium))
        .controlSize(.regular)
    }
}

/// A preset in the menu: one click and the whole mix changes.
struct PresetChip: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    var preset: Preset
    var shortcut: Int?

    var body: some View {
        let on = model.activePresetID == preset.id
        Button {
            withAnimation(.snappy) { model.apply(preset) }
        } label: {
            HStack(spacing: 8) {
                Doodle(name: faceOf(preset, in: model.catalogue), active: on)
                    .frame(width: 26, height: 26)
                VStack(alignment: .leading, spacing: 1) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(preset.name).font(.hand(16, weight: .semibold)).lineLimit(1)
                        if !preset.jp.isEmpty {
                            Text(preset.jp).font(.zen(8.5)).foregroundStyle(paper.accentText).lineLimit(1)
                        }
                    }
                    Text(preset.blurb.isEmpty ? mixLine : preset.blurb)
                        .font(.zen(9.5))
                        .foregroundStyle(paper.inkSoft)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 7)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .inkCard("menu-preset-\(preset.id)", radius: 13, active: on, interactive: true)
        .modifier(OptionalShortcut(number: shortcut))
        .help(preset.blurb.isEmpty ? mixLine : preset.blurb)
        .accessibilityLabel("\(preset.name) preset")
        .accessibilityAddTraits(on ? .isSelected : [])
        .contextMenu {
            Button("Play") { model.apply(preset) }
            Button("Edit in Mixer…") {
                PresetEditing.shared.request = preset
                AppActions.openMixer?()
            }
            if !preset.builtIn {
                Button("Update with current mix") {
                    var p = preset
                    let snap = model.snapshot(name: p.name)
                    p.mix = snap.mix
                    p.music = snap.music
                    p.master = snap.master
                    model.presets.save(p)
                }
                .disabled(!model.hasMix)
                Divider()
                Button("Delete", role: .destructive) { model.presets.delete(preset.id) }
            } else {
                Button("Hide from menu") { model.presets.hiddenBuiltIns.insert(preset.id) }
            }
        }
    }

    private var mixLine: String {
        let names = preset.mix.sorted { $0.value > $1.value }.compactMap { model.catalogue.sound($0.key)?.name.lowercased() }
        return (names + (preset.music.map { [$0.mode.name.lowercased()] } ?? [])).joined(separator: ", ")
    }
}

private struct OptionalShortcut: ViewModifier {
    var number: Int?
    func body(content: Content) -> some View {
        if let number {
            content.keyboardShortcut(KeyEquivalent(Character("\(number)")), modifiers: .command)
        } else {
            content
        }
    }
}

/// A sound in the mix: its doodle, its name, its fader, and a way out.
struct ActiveRow: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    var sound: Sound

    var body: some View {
        HStack(spacing: 8) {
            Doodle(name: sound.doodle, active: true).frame(width: 22, height: 22)
            Text(sound.name)
                .font(.zen(11.5))
                .lineLimit(1)
                .frame(width: 96, alignment: .leading)
            LevelSlider(value: model.levels[sound.id] ?? 0, label: "\(sound.name) level") {
                model.setLevel(sound.id, max($0, 0.01))
            }
            Button {
                withAnimation(.snappy) { model.setLevel(sound.id, 0) }
            } label: {
                Image(systemName: "xmark").font(.system(size: 9, weight: .bold))
            }
            .buttonStyle(.borderless)
            .foregroundStyle(paper.inkSoft)
            .help("Remove \(sound.name)")
            .accessibilityLabel("Remove \(sound.name)")
        }
        .frame(height: 34)
    }
}
