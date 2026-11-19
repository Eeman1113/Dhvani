import SwiftUI

/// Lets the menu bar ask the mixer window to open the preset editor.
@Observable
final class PresetEditing {
    static let shared = PresetEditing()
    var request: Preset?
}

enum MixerPage: Hashable {
    case playing, presets, music
    case group(String)
}

/// The whole site, as a Mac window: every sound, every preset, the music
/// deck, under a sidebar of the same groups the site scrolls through.
struct MixerWindow: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    @State private var page: MixerPage? = .playing
    @State private var search = ""
    @State private var editing: Preset?
    @State private var editRequests = PresetEditing.shared

    var body: some View {
        NavigationSplitView {
            sidebar
                .navigationSplitViewColumnWidth(min: 190, ideal: 214, max: 280)
        } detail: {
            ZStack {
                PaperBackdrop()
                ScrollView {
                    detail
                        .padding(.horizontal, 28)
                        .padding(.vertical, 22)
                        .frame(maxWidth: 1100)
                        .frame(maxWidth: .infinity)
                }
                .scrollEdgeEffectStyle(.soft, for: .top)
            }
            .foregroundStyle(paper.ink)
            .toolbar { toolbar }
            .searchable(text: $search, placement: .toolbar, prompt: "Find a sound")
        }
        .sheet(item: $editing) { p in
            PresetEditor(draft: p).paperRoot().environment(model)
        }
        .onChange(of: editRequests.request) { _, req in
            if let req {
                editing = req.builtIn ? model.presets.duplicate(req) : req
                editRequests.request = nil
            }
        }
        .onAppear {
            DockPolicy.windowOpened()
            #if DEBUG
            switch ProcessInfo.processInfo.environment["DHVANI_PAGE"] {
            case "presets": page = .presets
            case "music": page = .music
            case let g? where g.hasPrefix("group:"): page = .group(String(g.dropFirst(6)))
            default: break
            }
            #endif
            if let req = editRequests.request {
                editing = req.builtIn ? model.presets.duplicate(req) : req
                editRequests.request = nil
            }
        }
        .onDisappear { DockPolicy.windowClosed() }
        .frame(minWidth: 760, minHeight: 520)
    }

    // MARK: sidebar

    private var sidebar: some View {
        List(selection: $page) {
            Section {
                Label {
                    Text("Now playing")
                } icon: {
                    Image(systemName: model.isPlaying ? "waveform" : "pause.circle")
                        .symbolEffect(.variableColor.iterative, isActive: model.isPlaying)
                }
                .badge(model.activeSounds.count + (model.music == nil ? 0 : 1))
                .tag(MixerPage.playing)
                Label("Presets", systemImage: "square.stack.3d.up").tag(MixerPage.presets)
                Label("Music", systemImage: "music.note").tag(MixerPage.music)
            }
            Section("Sounds") {
                ForEach(model.catalogue.groups) { g in
                    let n = model.catalogue.sounds(in: g).filter { model.levels[$0.id] != nil }.count
                    Label {
                        HStack(spacing: 6) {
                            Text(g.name)
                            Text(g.jp).font(.zen(10)).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Doodle(name: model.catalogue.sounds(in: g).first?.doodle ?? "rain", active: n > 0)
                            .frame(width: 18, height: 18)
                    }
                    .badge(n)
                    .tag(MixerPage.group(g.id))
                }
            }
        }
        .listStyle(.sidebar)
        .listItemTint(.fixed(paper.accentText))
    }

    // MARK: detail

    @ViewBuilder
    private var detail: some View {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            let groupNames = Dictionary(uniqueKeysWithValues: model.catalogue.groups.map { ($0.id, $0.name.lowercased()) })
            let hits = model.catalogue.sounds.filter { s in
                s.name.lowercased().contains(q) || s.note.lowercased().contains(q) || s.jp.contains(q)
                    || (groupNames[s.group]?.contains(q) ?? false)
            }
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(title: "Found", jp: "探", gloss: "\(hits.count) sound\(hits.count == 1 ? "" : "s") for “\(search)”")
                soundGrid(hits)
            }
        } else {
            switch page ?? .playing {
            case .playing: playingPage
            case .presets: presetsPage
            case .music: musicPage
            case .group(let id):
                if let g = model.catalogue.groups.first(where: { $0.id == id }) {
                    VStack(alignment: .leading, spacing: 14) {
                        SectionHeader(title: g.name, jp: g.jp, gloss: g.blurb, size: 28)
                        soundGrid(model.catalogue.sounds(in: g))
                    }
                }
            }
        }
    }

    private func soundGrid(_ sounds: [Sound]) -> some View {
        GlassEffectContainer(spacing: 14) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 158, maximum: 220), spacing: 14)], spacing: 14) {
                ForEach(sounds) { SoundCard(sound: $0) }
            }
        }
    }

    private var playingPage: some View {
        VStack(alignment: .leading, spacing: 26) {
            VStack(spacing: 10) {
                Image("Logo")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 74)
                    .foregroundStyle(paper.ink)
                    .accessibilityLabel("Dhvani")
                Text("ध्वनि is the Sanskrit word for sound. Stack as many of these as you like, set the levels, and leave it running. Most of it is synthesised as you listen, so it never loops.")
                    .font(.zen(12.5))
                    .foregroundStyle(paper.inkSoft)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 520)
            }
            .frame(maxWidth: .infinity)

            transport

            if model.activeSounds.isEmpty && model.music == nil {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader(title: "Start somewhere", jp: "下地", gloss: "a mix already made, which you can then pull apart")
                    presetGrid(Array(model.presets.visible.prefix(6)))
                }
            } else {
                if model.music != nil {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "Music", jp: "音楽", gloss: "written one bar at a time")
                        musicCards
                    }
                }
                if !model.activeSounds.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "In the mix", jp: "今", gloss: "\(model.activeSounds.count) sound\(model.activeSounds.count == 1 ? "" : "s")")
                        soundGrid(model.activeSounds)
                    }
                }
            }
        }
    }

    private var transport: some View {
        HStack(spacing: 16) {
            Button {
                withAnimation(.snappy) { model.togglePlay() }
            } label: {
                Image(systemName: model.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .frame(width: 46, height: 46)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.circle)
            .accessibilityLabel(model.isPlaying ? "Pause" : "Play")

            VStack(alignment: .leading, spacing: 4) {
                Text(model.isPlaying ? model.summary : model.hasMix ? "Paused" : "Silence")
                    .font(.hand(24, weight: .semibold))
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Image(systemName: "speaker.fill").font(.system(size: 10)).foregroundStyle(paper.inkSoft)
                    LevelSlider(value: model.master, label: "Master volume") { model.setMaster($0) }
                        .frame(maxWidth: 260)
                    Text("\(Int(model.master * 100))").font(.zen(11)).monospacedDigit().foregroundStyle(paper.inkSoft)
                }
            }
            Spacer()
            TimerMenu().fixedSize().paperGlass()
            Button {
                editing = model.snapshot(name: "")
            } label: {
                Label("Save as preset", systemImage: "square.and.arrow.down")
            }
            .paperGlass()
            .disabled(!model.hasMix)
        }
        .padding(16)
        .inkCard("transport", radius: 20)
    }

    // MARK: presets

    private var presetsPage: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    SectionHeader(title: "Your presets", jp: "私の", gloss: "one click sets every level", size: 28)
                    Button {
                        editing = model.snapshot(name: "")
                    } label: {
                        Label("New from current mix", systemImage: "plus")
                    }
                    .buttonStyle(.glassProminent)
                }
                if model.presets.user.isEmpty {
                    Text("Nothing saved yet. Build a mix you like, then press “New from current mix”, or right-click any built-in preset to make it your own.")
                        .font(.zen(12)).foregroundStyle(paper.inkSoft)
                        .padding(.vertical, 6)
                } else {
                    presetGrid(model.presets.user)
                }
            }
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Ways in", jp: "下地", gloss: "the site's own mixes", size: 24)
                presetGrid(model.presets.builtIn)
            }
        }
    }

    private func presetGrid(_ list: [Preset]) -> some View {
        GlassEffectContainer(spacing: 14) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 240, maximum: 360), spacing: 14)], spacing: 14) {
                ForEach(list) { p in
                    PresetCard(preset: p) { editing = p.builtIn ? model.presets.duplicate(p) : p }
                }
            }
        }
    }

    // MARK: music

    private var musicPage: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Music", jp: "音楽", gloss: "written one bar at a time, about two seconds ahead of what you hear", size: 28)
            musicCards
        }
    }

    private var musicCards: some View {
        GlassEffectContainer(spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                ForEach(MusicMode.allCases) { MusicCard(mode: $0) }
            }
        }
    }

    // MARK: toolbar

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .navigation) {
            Button {
                model.togglePlay()
            } label: {
                Label(model.isPlaying ? "Pause" : "Play", systemImage: model.isPlaying ? "pause.fill" : "play.fill")
            }
            .help(model.isPlaying ? "Pause (⌘P)" : "Play (⌘P)")
        }
        ToolbarItem {
            HStack(spacing: 6) {
                Image(systemName: "speaker.wave.2.fill").foregroundStyle(.secondary)
                Slider(value: Binding(get: { model.master }, set: { model.setMaster($0) }), in: 0...1)
                    .frame(width: 120)
                    .controlSize(.small)
                    .accessibilityLabel("Master volume")
            }
            .padding(.horizontal, 6)
        }
        ToolbarSpacer(.fixed)
        ToolbarItemGroup {
            TimerMenu(compact: true)
            Menu {
                ForEach(model.catalogue.themes) { t in
                    Button {
                        withAnimation(.easeInOut(duration: 0.6)) { model.themeID = t.id }
                    } label: {
                        if t.id == model.themeID {
                            Label("\(t.name) \(t.jp)", systemImage: "checkmark")
                        } else {
                            Text("\(t.name) \(t.jp)")
                        }
                    }
                }
            } label: {
                Label("Paper", systemImage: "paintpalette")
            }
            .help("Paper")
            Button(role: .destructive) {
                model.clear()
            } label: {
                Label("Clear", systemImage: "xmark.circle")
            }
            .disabled(!model.hasMix)
            .help("Stop everything and clear the mix")
        }
    }
}

/// A sound, the way the site draws it: a doodle, a name, its Japanese, and a
/// fader that appears once it is on.
struct SoundCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    var sound: Sound
    @State private var showNote = false

    var body: some View {
        let level = model.levels[sound.id]
        let on = level != nil
        VStack(spacing: 6) {
            Button {
                withAnimation(.snappy) { model.toggle(sound) }
            } label: {
                VStack(spacing: 6) {
                    Doodle(name: sound.doodle, active: on)
                        .frame(width: 50, height: 50)
                        .scaleEffect(on ? 1.06 : 1)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(sound.name).font(.hand(19, weight: .semibold)).lineLimit(1)
                        Text(sound.jp).font(.zen(9)).foregroundStyle(paper.accentText).lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 14)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(sound.name)\(sound.isRecording ? ", recording" : "")")
            .accessibilityValue(on ? "on, \(Int((level ?? 0) * 100)) percent" : "off")
            .accessibilityHint("Turns the sound \(on ? "off" : "on")")

            Group {
                if let level {
                    LevelSlider(value: level, label: "\(sound.name) level") { model.setLevel(sound.id, max($0, 0.01)) }
                } else {
                    Rectangle().fill(paper.line.opacity(0.6)).frame(height: 1).padding(.horizontal, 18)
                }
            }
            .frame(height: 22)
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
        .inkCard("sound-\(sound.id)", radius: 18, active: on)
        .overlay(alignment: .topTrailing) {
            HStack(spacing: 4) {
                if sound.isRecording {
                    Text("録").font(.zen(10)).foregroundStyle(paper.accentText).help("A real recording, credited in Settings › About")
                }
                Button { showNote.toggle() } label: {
                    Image(systemName: "info.circle").font(.system(size: 11))
                }
                .buttonStyle(.borderless)
                .foregroundStyle(paper.inkSoft)
                .accessibilityLabel("About \(sound.name)")
                .popover(isPresented: $showNote, arrowEdge: .bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(sound.name).font(.hand(20, weight: .semibold))
                        Text(sound.note).font(.zen(12)).fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(14)
                    .frame(width: 260)
                }
            }
            .padding(10)
        }
    }
}

struct PresetCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    var preset: Preset
    var edit: () -> Void

    var body: some View {
        let on = model.activePresetID == preset.id
        Button {
            withAnimation(.snappy) { model.apply(preset) }
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Doodle(name: faceOf(preset, in: model.catalogue), active: on)
                    .frame(width: 44, height: 44)
                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text(preset.name).font(.hand(21, weight: .semibold)).lineLimit(1)
                        Text(preset.jp).font(.zen(10)).foregroundStyle(paper.accentText)
                    }
                    if !preset.blurb.isEmpty {
                        Text(preset.blurb).font(.zen(11.5)).foregroundStyle(paper.inkSoft).lineLimit(2)
                    }
                    Text(ingredients).font(.zen(10)).foregroundStyle(paper.inkSoft.opacity(0.85)).lineLimit(2)
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .inkCard("preset-\(preset.id)", radius: 18, active: on, interactive: true)
        .accessibilityAddTraits(on ? .isSelected : [])
        .contextMenu {
            Button("Play") { model.apply(preset) }
            Button(preset.builtIn ? "Make it my own…" : "Edit…", action: edit)
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
                Button("Duplicate") { _ = model.presets.duplicate(preset) }
                Divider()
                Button("Delete", role: .destructive) { model.presets.delete(preset.id) }
            } else {
                let hidden = model.presets.hiddenBuiltIns.contains(preset.id)
                Button(hidden ? "Show in menu bar" : "Hide from menu bar") {
                    if hidden { model.presets.hiddenBuiltIns.remove(preset.id) } else { model.presets.hiddenBuiltIns.insert(preset.id) }
                }
            }
        }
    }

    private var ingredients: String {
        let names = preset.mix.sorted { $0.value > $1.value }.compactMap { id, v in
            model.catalogue.sound(id).map { "\($0.name.lowercased()) \(Int(v * 100))" }
        }
        let music = preset.music.map { ["\($0.mode.name.lowercased()) \(Int($0.level * 100))"] } ?? []
        return (names + music).joined(separator: " · ")
    }
}

struct MusicCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    var mode: MusicMode

    var body: some View {
        let on = model.music?.mode == mode
        VStack(alignment: .leading, spacing: 10) {
            Button {
                withAnimation(.snappy) { model.setMusicMode(on ? nil : mode) }
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Doodle(name: mode.doodle, active: on).frame(width: 48, height: 48)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            Text(mode.name).font(.hand(23, weight: .semibold))
                            Text(mode.jp).font(.zen(10)).foregroundStyle(paper.accentText)
                        }
                        Text(mode.blurb).font(.zen(11.5)).foregroundStyle(paper.inkSoft).fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityValue(on ? "on" : "off")

            if on, let m = model.music {
                LevelSlider(value: m.level, label: "\(mode.name) level") { model.setMusicLevel($0) }
                HStack {
                    if let np = model.nowPlaying {
                        Text("\(np.key) · \(np.progression) · \(Int(np.bpm)) bpm · bar \(np.bar)")
                            .font(.zen(10.5)).monospacedDigit().foregroundStyle(paper.inkSoft).lineLimit(1)
                    }
                    Spacer()
                    Button {
                        model.rerollMusic()
                    } label: {
                        Label("New key", systemImage: "shuffle")
                    }
                    .paperGlass()
                    .controlSize(.small)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .inkCard("music-\(mode.rawValue)", radius: 18, active: on)
    }
}

/// A menu bar app that hides its Dock icon still needs one while a window is
/// open, or the window cannot be found again with ⌘-Tab.
enum DockPolicy {
    private static var open = 0

    static func apply() {
        NSApp.setActivationPolicy(Prefs.showInDock || open > 0 ? .regular : .accessory)
    }

    static func windowOpened() {
        open += 1
        apply()
        NSApp.activate()
    }

    static func windowClosed() {
        open = max(0, open - 1)
        apply()
    }
}
