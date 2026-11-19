import AppKit
import CoreAudio

/// The moments a noise machine should get out of the way by itself: the Mac
/// going to sleep, the screen locking, headphones coming out.
final class SystemEvents {
    private let model: AppModel
    private var pausedForSleep = false
    private var pausedForLock = false
    private var lastOutput = OutputDevice.current()

    init(model: AppModel) {
        self.model = model
    }

    func start() {
        let ws = NSWorkspace.shared.notificationCenter
        ws.addObserver(forName: NSWorkspace.willSleepNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.willSleep() }
        }
        ws.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.didWake() }
        }

        let dist = DistributedNotificationCenter.default()
        dist.addObserver(forName: .init("com.apple.screenIsLocked"), object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.locked() }
        }
        dist.addObserver(forName: .init("com.apple.screenIsUnlocked"), object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.unlocked() }
        }

        OutputDevice.watch { [weak self] in self?.outputChanged() }
    }

    private func willSleep() {
        guard Prefs.pauseOnSleep, model.isPlaying else { return }
        pausedForSleep = true
        model.pause(fade: 0.2)
    }

    private func didWake() {
        defer { pausedForSleep = false }
        guard pausedForSleep, Prefs.resumeOnWake else { return }
        model.play(fade: 2)
    }

    private func locked() {
        guard Prefs.pauseOnLock, model.isPlaying else { return }
        pausedForLock = true
        model.pause(fade: 1)
    }

    private func unlocked() {
        defer { pausedForLock = false }
        guard pausedForLock, Prefs.resumeOnUnlock else { return }
        model.play(fade: 2)
    }

    /// Headphones out means the mix is about to come out of the speakers,
    /// which in an office or a shared bedroom is the last thing anyone wants.
    private func outputChanged() {
        let now = OutputDevice.current()
        defer { lastOutput = now }
        guard Prefs.pauseOnHeadphonesUnplugged, model.isPlaying, let before = lastOutput, let now else { return }
        if before.isPrivate && !now.isPrivate { model.pause(fade: 0.15) }
    }
}

/// Just enough CoreAudio to tell headphones from speakers.
struct OutputDevice: Equatable {
    let id: AudioDeviceID
    let transport: UInt32
    let dataSource: UInt32?

    /// Headphones of any kind: Bluetooth, USB, or plugged into the jack.
    var isPrivate: Bool {
        if transport == kAudioDeviceTransportTypeBuiltIn {
            // The built-in device switches data source when a jack goes in.
            return dataSource == 0x6864_706E // 'hdpn'
        }
        return transport == kAudioDeviceTransportTypeBluetooth
            || transport == kAudioDeviceTransportTypeBluetoothLE
            || transport == kAudioDeviceTransportTypeUSB
    }

    static func current() -> OutputDevice? {
        var id = AudioDeviceID(0)
        var size = UInt32(MemoryLayout<AudioDeviceID>.size)
        var addr = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &id) == noErr else { return nil }
        return OutputDevice(id: id, transport: read(id, kAudioDevicePropertyTransportType, kAudioObjectPropertyScopeGlobal) ?? 0,
                            dataSource: read(id, kAudioDevicePropertyDataSource, kAudioDevicePropertyScopeOutput))
    }

    private static func read(_ id: AudioDeviceID, _ selector: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope) -> UInt32? {
        var value = UInt32(0)
        var size = UInt32(MemoryLayout<UInt32>.size)
        var addr = AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
        guard AudioObjectHasProperty(id, &addr) else { return nil }
        return AudioObjectGetPropertyData(id, &addr, 0, nil, &size, &value) == noErr ? value : nil
    }

    /// Calls back on the main queue when the default output, or the built-in
    /// device's jack state, changes.
    static func watch(_ onChange: @escaping @MainActor () -> Void) {
        var defaultAddr = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &defaultAddr, .main) { _, _ in
            MainActor.assumeIsolated { onChange() }
        }
        if let dev = current() {
            var sourceAddr = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyDataSource,
                mScope: kAudioDevicePropertyScopeOutput,
                mElement: kAudioObjectPropertyElementMain
            )
            if AudioObjectHasProperty(dev.id, &sourceAddr) {
                AudioObjectAddPropertyListenerBlock(dev.id, &sourceAddr, .main) { _, _ in
                    MainActor.assumeIsolated { onChange() }
                }
            }
        }
    }
}
