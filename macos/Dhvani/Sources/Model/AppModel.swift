import AppKit
import Observation

/// The whole state of the app: what is in the mix, whether it is playing,
/// the sleep timer, and the paper. The engine is told about every change and
/// never asked; this is the source of truth, and it survives relaunches.
@Observable
final class AppModel {
    static let shared = AppModel()

    let catalogue: Catalogue
    let presets: PresetLibrary
    @ObservationIgnored let engine = AudioEngine()

    private(set) var levels: [String: Double] = [:]
    private(set) var music: MusicSetting?
    private(set) var master: Double = 0.8
    private(set) var paused = true
    private(set) var activePresetID: String?
    private(set) var lastPresetID: String?
    private(set) var nowPlaying: NowPlayingMusic?
    private(set) var engineState = "loading"

    private(set) var timerEndsAt: Date?
    private(set) var timerRemaining: TimeInterval?

    var themeID: String {
        didSet { saveSoon() }
    }

    /// Whether the engine has been handed the mix since it last (re)loaded.
    /// A mix restored paused at launch is not built until someone presses play.
    @ObservationIgnored private var engineHasMix = false
    @ObservationIgnored private var timerFading = false
    @ObservationIgnored private var saveTask: Task<Void, Never>?
    @ObservationIgnored private var lastMusicLevel = 0.5

    private init() {
        Prefs.register()
        let catalogue = Catalogue.load()
        self.catalogue = catalogue
        presets = PresetLibrary(catalogue: catalogue)
        themeID = catalogue.defaultTheme

        let session = Session.load()
        master = session?.master ?? 0.8
        themeID = session?.theme ?? catalogue.defaultTheme
        lastPresetID = session?.lastPresetID

        switch Prefs.launchPlayback {
        case .resume, .restorePaused:
            levels = session?.levels.filter { catalogue.sound($0.key) != nil } ?? [:]
            music = session?.music
            activePresetID = session?.activePresetID
        case .preset, .silent:
            break
        }

        engine.onReady = { [weak self] in self?.engineDidLoad() }
        engine.onStatus = { [weak self] status in
            guard let self else { return }
            if engineState != status.state {
                NSLog("[dhvani] engine audio %@", status.state)
                engineState = status.state
            }
            if nowPlaying != status.nowPlaying { nowPlaying = status.nowPlaying }
        }
        engine.setMaster(master)

        switch Prefs.launchPlayback {
        case .resume where hasMix: play()
        case .preset:
            if let p = presets.preset(Prefs.launchPresetID) { apply(p) }
        default: break
        }

        startTicking()
    }

    // MARK: derived

    var hasMix: Bool { !levels.isEmpty || music != nil }
    var isPlaying: Bool { !paused && hasMix }

    /// In catalogue order, so the list does not reshuffle as levels change.
    var activeSounds: [Sound] { catalogue.sounds.filter { levels[$0.id] != nil } }

    var activePreset: Preset? { presets.preset(activePresetID) }

    var theme: PaperTheme { catalogue.theme(themeID) }

    /// A short line for the menu bar tooltip and Now Playing.
    var summary: String {
        if let p = activePreset { return p.name }
        let names = activeSounds.prefix(3).map(\.name) + (music.map { [$0.mode.name] } ?? [])
        if names.isEmpty { return "Nothing playing" }
        let more = activeSounds.count > 3 ? " +\(activeSounds.count - 3)" : ""
        return names.joined(separator: ", ") + more
    }

    // MARK: transport

    func play(fade: Double = 0.6) {
        guard hasMix else {
            // Pressing play on an empty mix should still do something useful.
            if let p = presets.preset(lastPresetID) ?? presets.visible.first { apply(p) }
            return
        }
        if !engineHasMix { pushMix() }
        paused = false
        engine.play(fade: fade)
        NowPlayingBridge.shared.update(self)
    }

    func pause(fade: Double = 0.6) {
        guard !paused else { return }
        paused = true
        engine.pause(fade: fade)
        NowPlayingBridge.shared.update(self)
    }

    func togglePlay() {
        isPlaying ? pause() : play()
    }

    // MARK: the mix

    func setLevel(_ id: String, _ level: Double) {
        let level = min(max(level, 0), 1)
        if level <= 0 { levels[id] = nil } else { levels[id] = level }
        if engineHasMix { engine.setLevel(id, level) } else { pushMix() }
        activePresetID = matchingPreset()
        startIfPaused()
        saveSoon()
    }

    func toggle(_ sound: Sound) {
        setLevel(sound.id, levels[sound.id] == nil ? sound.defaultLevel : 0)
    }

    func setMusicMode(_ mode: MusicMode?) {
        if let mode {
            music = MusicSetting(mode: mode, level: music?.level ?? lastMusicLevel)
        } else {
            if let music { lastMusicLevel = music.level }
            music = nil
        }
        if engineHasMix { engine.setMusic(music) } else { pushMix() }
        activePresetID = matchingPreset()
        startIfPaused()
        saveSoon()
    }

    func setMusicLevel(_ level: Double) {
        guard var m = music else { return }
        m.level = level
        music = m
        lastMusicLevel = level
        engine.setMusic(m)
        saveSoon()
    }

    func rerollMusic() { engine.rerollMusic() }

    func setMaster(_ v: Double) {
        master = min(max(v, 0), 1)
        engine.setMaster(master)
        saveSoon()
    }

    func clear() {
        levels = [:]
        music = nil
        activePresetID = nil
        engine.stopAll()
        paused = true
        NowPlayingBridge.shared.update(self)
        saveSoon()
    }

    /// Presets replace rather than pile up: anything not in it fades out.
    func apply(_ preset: Preset) {
        let next = preset.mix.filter { catalogue.sound($0.key) != nil && $0.value > 0 }
        if engineHasMix {
            for id in levels.keys where next[id] == nil { engine.setLevel(id, 0) }
            for (id, v) in next { engine.setLevel(id, v) }
            engine.setMusic(preset.music)
        }
        levels = next
        music = preset.music
        if let m = preset.master { setMaster(m) }
        if let t = preset.theme, Prefs.presetsChangePaper { themeID = t }
        if !engineHasMix { pushMix() }
        activePresetID = preset.id
        lastPresetID = preset.id
        if paused {
            paused = false
            engine.play()
        }
        NowPlayingBridge.shared.update(self)
        saveSoon()
    }

    /// Steps through the visible presets, for the media "next" key and the hotkey.
    func nextPreset(_ step: Int = 1) {
        let list = presets.visible
        guard !list.isEmpty else { return }
        let i = list.firstIndex { $0.id == (activePresetID ?? lastPresetID) } ?? -step
        apply(list[((i + step) % list.count + list.count) % list.count])
    }

    /// The current mix, as a preset that has not been named yet.
    func snapshot(name: String) -> Preset {
        var p = Preset.new(name: name)
        p.mix = levels
        p.music = music
        p.master = master
        p.theme = themeID
        return p
    }

    // MARK: sleep timer

    func setTimer(minutes: Int?) {
        if timerFading, isPlaying { engine.play(fade: 1.5) }
        timerFading = false
        if let minutes {
            timerEndsAt = .now.addingTimeInterval(TimeInterval(minutes * 60))
            timerRemaining = TimeInterval(minutes * 60)
        } else {
            timerEndsAt = nil
            timerRemaining = nil
        }
    }

    private func startTicking() {
        Task { [weak self] in
            while true {
                try? await Task.sleep(for: .seconds(1))
                self?.tick()
            }
        }
    }

    private func tick() {
        guard let end = timerEndsAt else { return }
        let left = end.timeIntervalSinceNow
        timerRemaining = max(0, left)
        let fade = Prefs.timerFadeSeconds
        if !timerFading, left <= fade, isPlaying {
            // Sleep should arrive slowly. The engine fades over whatever is left.
            timerFading = true
            engine.pause(fade: max(left, 1))
        }
        guard left <= 0 else { return }
        timerEndsAt = nil
        timerRemaining = nil
        timerFading = false
        switch Prefs.timerEndAction {
        case .pause:
            paused = true
            engine.pause(fade: 0.3)
            NowPlayingBridge.shared.update(self)
        case .clear:
            clear()
        case .quit:
            save()
            NSApp.terminate(nil)
        }
    }

    // MARK: engine

    private func startIfPaused() {
        guard paused, hasMix else { return }
        paused = false
        engine.play()
        NowPlayingBridge.shared.update(self)
    }

    private func pushMix() {
        engine.setMaster(master)
        for (id, v) in levels { engine.setLevel(id, v) }
        engine.setMusic(music)
        engineHasMix = true
    }

    /// Also runs after WebKit restarts a crashed engine, which comes back empty.
    private func engineDidLoad() {
        engine.setMaster(master)
        if !paused {
            pushMix()
            engine.play()
        } else {
            engineHasMix = false
        }
    }

    /// A mix someone has nudged is no longer the preset it started as.
    private func matchingPreset() -> String? {
        guard let p = activePreset else { return nil }
        let same = p.mix.count == levels.count
            && p.mix.allSatisfy { abs((levels[$0.key] ?? -1) - $0.value) < 0.001 }
            && p.music == music
        return same ? p.id : nil
    }

    // MARK: persistence

    private struct Session: Codable {
        var levels: [String: Double]
        var music: MusicSetting?
        var master: Double
        var theme: String
        var activePresetID: String?
        var lastPresetID: String?

        static let key = "session.v1"
        static func load() -> Session? {
            UserDefaults.standard.data(forKey: key).flatMap { try? JSONDecoder().decode(Session.self, from: $0) }
        }
    }

    /// Debounced, because a slider drag is sixty changes a second.
    private func saveSoon() {
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            self?.save()
        }
    }

    func save() {
        let s = Session(levels: levels, music: music, master: master, theme: themeID, activePresetID: activePresetID, lastPresetID: lastPresetID)
        if let data = try? JSONEncoder().encode(s) { UserDefaults.standard.set(data, forKey: Session.key) }
    }
}
