import AppKit
import MediaPlayer

/// Puts Dhvani in Control Center's Now Playing and on the keyboard's media
/// keys: play/pause toggles the mix, and next/previous step through presets.
final class NowPlayingBridge {
    static let shared = NowPlayingBridge()
    private var registered = false

    func start(_ model: AppModel) {
        guard !registered, Prefs.mediaKeys else { return }
        registered = true
        let center = MPRemoteCommandCenter.shared()
        // MediaPlayer calls these on a queue of its own choosing.
        func on(_ cmd: MPRemoteCommand, _ run: @escaping @MainActor (AppModel) -> Void) {
            cmd.addTarget { @Sendable _ in
                Task { @MainActor in run(model) }
                return .success
            }
        }
        on(center.playCommand) { $0.play() }
        on(center.pauseCommand) { $0.pause() }
        on(center.togglePlayPauseCommand) { $0.togglePlay() }
        on(center.nextTrackCommand) { $0.nextPreset(1) }
        on(center.previousTrackCommand) { $0.nextPreset(-1) }
        update(model)
    }

    func stop() {
        guard registered else { return }
        registered = false
        let center = MPRemoteCommandCenter.shared()
        for cmd in [center.playCommand, center.pauseCommand, center.togglePlayPauseCommand, center.nextTrackCommand, center.previousTrackCommand] {
            cmd.removeTarget(nil)
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        MPNowPlayingInfoCenter.default().playbackState = .stopped
    }

    func update(_ model: AppModel) {
        guard registered else { return }
        let info = MPNowPlayingInfoCenter.default()
        guard model.hasMix else {
            info.nowPlayingInfo = nil
            info.playbackState = .stopped
            return
        }
        var meta: [String: Any] = [
            MPMediaItemPropertyTitle: model.summary,
            MPMediaItemPropertyArtist: "Dhvani",
            MPNowPlayingInfoPropertyIsLiveStream: true,
            MPNowPlayingInfoPropertyPlaybackRate: model.isPlaying ? 1.0 : 0.0,
        ]
        if let icon = NSApp.applicationIconImage {
            // Asked for off the main thread, while encoding the artwork.
            meta[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: icon.size) { @Sendable _ in icon }
        }
        info.nowPlayingInfo = meta
        info.playbackState = model.isPlaying ? .playing : .paused
    }
}
