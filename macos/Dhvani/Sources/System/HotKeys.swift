import AppKit
import Carbon.HIToolbox

/// A key and its modifiers, as recorded from a real keypress.
struct KeyCombo: Codable, Equatable {
    var keyCode: UInt32
    /// NSEvent.ModifierFlags raw value, device-independent bits only.
    var modifiers: UInt
    /// What the key printed when it was recorded, for display.
    var key: String

    var flags: NSEvent.ModifierFlags { NSEvent.ModifierFlags(rawValue: modifiers) }

    var display: String {
        var s = ""
        if flags.contains(.control) { s += "⌃" }
        if flags.contains(.option) { s += "⌥" }
        if flags.contains(.shift) { s += "⇧" }
        if flags.contains(.command) { s += "⌘" }
        return s + key
    }

    var carbonModifiers: UInt32 {
        var m: UInt32 = 0
        if flags.contains(.command) { m |= UInt32(cmdKey) }
        if flags.contains(.option) { m |= UInt32(optionKey) }
        if flags.contains(.control) { m |= UInt32(controlKey) }
        if flags.contains(.shift) { m |= UInt32(shiftKey) }
        return m
    }

    init(keyCode: UInt32, modifiers: NSEvent.ModifierFlags, key: String) {
        self.keyCode = keyCode
        self.modifiers = modifiers.intersection([.command, .option, .control, .shift]).rawValue
        self.key = key
    }

    init?(event: NSEvent) {
        let mods = event.modifierFlags.intersection([.command, .option, .control, .shift])
        // A global shortcut with no modifier would swallow that key everywhere.
        guard !mods.isEmpty, !mods.subtracting(.shift).isEmpty else { return nil }
        let key = Self.name(for: event)
        self.init(keyCode: UInt32(event.keyCode), modifiers: mods, key: key)
    }

    private static func name(for event: NSEvent) -> String {
        switch Int(event.keyCode) {
        case kVK_Space: return "Space"
        case kVK_Return: return "↩"
        case kVK_LeftArrow: return "←"
        case kVK_RightArrow: return "→"
        case kVK_UpArrow: return "↑"
        case kVK_DownArrow: return "↓"
        case kVK_Escape: return "⎋"
        case kVK_Delete: return "⌫"
        case kVK_Tab: return "⇥"
        default: return (event.charactersIgnoringModifiers ?? "?").uppercased()
        }
    }

    static func load(_ key: String) -> KeyCombo? {
        UserDefaults.standard.data(forKey: key).flatMap { try? JSONDecoder().decode(KeyCombo.self, from: $0) }
    }

    static func save(_ combo: KeyCombo?, _ key: String) {
        if let combo, let data = try? JSONEncoder().encode(combo) {
            UserDefaults.standard.set(data, forKey: key)
        } else {
            UserDefaults.standard.removeObject(forKey: key)
        }
    }
}

/// System-wide shortcuts, which work while any other app is in front.
///
/// Carbon's RegisterEventHotKey is still the one API for this that needs no
/// accessibility permission, so it is used here instead of an event tap.
final class HotKeys {
    static let shared = HotKeys()

    enum Action: UInt32, CaseIterable {
        case toggle = 1, nextPreset, mixer

        var prefKey: String {
            switch self {
            case .toggle: PrefKey.hotkeyToggle
            case .nextPreset: PrefKey.hotkeyNextPreset
            case .mixer: PrefKey.hotkeyMixer
            }
        }

        var label: String {
            switch self {
            case .toggle: "Play or pause"
            case .nextPreset: "Next preset"
            case .mixer: "Open the mixer"
            }
        }

        var defaultCombo: KeyCombo? {
            switch self {
            case .toggle: KeyCombo(keyCode: UInt32(kVK_ANSI_P), modifiers: [.control, .option, .command], key: "P")
            case .nextPreset: KeyCombo(keyCode: UInt32(kVK_ANSI_N), modifiers: [.control, .option, .command], key: "N")
            case .mixer: nil
            }
        }
    }

    var handler: ((Action) -> Void)?
    private var refs: [Action: EventHotKeyRef] = [:]
    private var installed = false

    func combo(for action: Action) -> KeyCombo? {
        if UserDefaults.standard.object(forKey: action.prefKey) == nil { return action.defaultCombo }
        return KeyCombo.load(action.prefKey)
    }

    func set(_ combo: KeyCombo?, for action: Action) {
        if let combo {
            KeyCombo.save(combo, action.prefKey)
        } else {
            // Stored as an explicit "none" so the default does not come back.
            UserDefaults.standard.set(Data(), forKey: action.prefKey)
        }
        register(action)
    }

    func registerAll() {
        installHandler()
        Action.allCases.forEach(register)
    }

    private func register(_ action: Action) {
        if let ref = refs.removeValue(forKey: action) { UnregisterEventHotKey(ref) }
        guard let combo = combo(for: action) else { return }
        var ref: EventHotKeyRef?
        let id = EventHotKeyID(signature: OSType(0x4448_564E), id: action.rawValue) // 'DHVN'
        let status = RegisterEventHotKey(combo.keyCode, combo.carbonModifiers, id, GetApplicationEventTarget(), 0, &ref)
        if status == noErr, let ref { refs[action] = ref }
    }

    private func installHandler() {
        guard !installed else { return }
        installed = true
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, event, _ in
            var id = EventHotKeyID()
            GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil,
                              MemoryLayout<EventHotKeyID>.size, nil, &id)
            DispatchQueue.main.async {
                if let action = HotKeys.Action(rawValue: id.id) { HotKeys.shared.handler?(action) }
            }
            return noErr
        }, 1, &spec, nil, nil)
    }
}
