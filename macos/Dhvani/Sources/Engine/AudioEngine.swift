import AppKit
import UniformTypeIdentifiers
import WebKit

/// The website's synthesis engine, running headless.
///
/// Fifty-seven ambiences and two generative music decks are a few thousand
/// lines of Web Audio, tuned by ear. Re-writing them for AVAudioEngine would
/// give a second engine that sounds slightly different from the first, so the
/// app runs the same code instead, in a web view that is never on screen, and
/// draws its whole interface natively around it. See src/native/bridge.ts.
final class AudioEngine: NSObject {
    struct Status: Decodable {
        let state: String
        let nowPlaying: NowPlayingMusic?
    }

    var onStatus: ((Status) -> Void)?
    var onReady: (() -> Void)?

    private var webView: WKWebView!
    private var host: NSWindow!
    private var ready = false
    private var pending: [String] = []

    override init() {
        super.init()
        let config = WKWebViewConfiguration()
        // There is no user gesture to wait for: the user pressed play in the
        // menu bar, which the page cannot see.
        config.mediaTypesRequiringUserActionForPlayback = []
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.userContentController.add(WeakMessageHandler(self), name: "dhvani")
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 8, height: 8), configuration: config)
        #if DEBUG
        webView.isInspectable = true
        #endif
        webView.navigationDelegate = self

        // WebKit interrupts audio in a page that is not in a window, so the
        // engine gets one: borderless, a few points square, parked off every
        // screen, never shown in Mission Control, the Window menu or ⌘-Tab.
        host = NSWindow(
            contentRect: NSRect(x: -10_000, y: -10_000, width: 8, height: 8),
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )
        host.isReleasedWhenClosed = false
        host.ignoresMouseEvents = true
        host.hasShadow = false
        host.isOpaque = false
        host.backgroundColor = .clear
        host.collectionBehavior = [.transient, .ignoresCycle, .stationary, .canJoinAllSpaces]
        host.isExcludedFromWindowsMenu = true
        host.contentView = webView
        host.orderFrontRegardless()
        load()
    }

    private func load() {
        ready = false
        webView.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://app/index.html")!))
    }

    // MARK: calls into the page

    func setLevel(_ id: String, _ level: Double) { call("dhvani.setLevel(\(js(id)), \(level))") }
    func setMusic(_ music: MusicSetting?) {
        if let music {
            call("dhvani.setMusic(\(js(music.mode.rawValue)), \(music.level))")
        } else {
            call("dhvani.setMusic(null, 0)")
        }
    }
    func setMaster(_ v: Double) { call("dhvani.setMaster(\(v))") }
    func rerollMusic() { call("dhvani.rerollMusic()") }
    func stopAll() { call("dhvani.stopAll()") }
    func pause(fade: Double = 0.6) { call("dhvani.pause(\(fade))") }
    func play(fade: Double = 0.6) { call("dhvani.play(\(fade))") }

    private func call(_ script: String) {
        guard ready else {
            pending.append(script)
            return
        }
        // `; void 0` because some calls return a Promise, which WebKit
        // cannot hand back to Swift and reports as an error.
        webView.evaluateJavaScript("\(script); void 0") { _, error in
            if let error { NSLog("[dhvani] engine call failed: %@ (%@)", script, error.localizedDescription) }
        }
    }

    private func js(_ s: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: s, options: .fragmentsAllowed)
        return data.flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
    }
}

extension AudioEngine: WKScriptMessageHandler {
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "ready":
            ready = true
            let queued = pending
            pending.removeAll()
            queued.forEach(call)
            onReady?()
        case "status":
            guard
                let data = try? JSONSerialization.data(withJSONObject: body),
                let status = try? JSONDecoder().decode(Status.self, from: data)
            else { return }
            onStatus?(status)
        case "error":
            NSLog("[dhvani] engine: %@", String(describing: body["message"] ?? ""))
        default:
            break
        }
    }
}

extension AudioEngine: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: any Error) {
        NSLog("[dhvani] engine page failed: %@", error.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: any Error) {
        NSLog("[dhvani] engine page failed to load: %@", error.localizedDescription)
    }

    /// WebKit kills a page's process when memory runs short. Without this a
    /// four hour session would end in silence with nothing to say why.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("[dhvani] engine process ended; reloading")
        load()
    }
}

/// WKUserContentController retains its handlers, which would keep the engine
/// alive forever. It lives as long as the app anyway, but a cycle is a cycle.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        target?.userContentController(c, didReceive: m)
    }
}

/// Serves the engine page and the field recordings out of the app bundle.
///
/// A file:// page cannot fetch() its own audio files, and the engine fetches
/// every recording, so the bundle is served under its own scheme instead.
/// `/audio/…` maps to the recordings, anything else to Resources/Engine.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "dhvani-engine"

    func webView(_ webView: WKWebView, start task: any WKURLSchemeTask) {
        guard let url = task.request.url, let resources = Bundle.main.resourceURL else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let file = path.hasPrefix("audio/")
            ? resources.appending(path: path)
            : resources.appending(path: "Engine").appending(path: path)

        // Nothing outside the two folders it is meant to serve.
        guard file.standardizedFileURL.path.hasPrefix(resources.standardizedFileURL.path),
              let data = try? Data(contentsOf: file)
        else {
            let missing = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!
            task.didReceive(missing)
            task.didReceive(Data())
            task.didFinish()
            return
        }
        let mime = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": mime, "Content-Length": String(data.count)]
        )!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: any WKURLSchemeTask) {}
}
