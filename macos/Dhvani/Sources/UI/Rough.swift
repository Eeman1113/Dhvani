import SwiftUI

/// Hand-drawn geometry, ported from src/lib/rough.ts so a card's outline in
/// the app wobbles exactly the way the same card's outline does on the site.
///
/// Sample the ideal outline, push every point around by a seeded, slowly
/// wandering offset, and run a smooth curve back through them.
nonisolated enum Rough {
    /// The site's xorshift PRNG, bit for bit.
    struct Seeded {
        private var s: UInt32
        init(_ seed: UInt32) { s = seed == 0 ? 1 : seed }
        mutating func next() -> Double {
            s ^= s << 13
            s ^= s >> 17
            s ^= s << 5
            return Double(s % 100_000) / 100_000
        }
    }

    /// FNV-1a over UTF-16, as hashString() does in JS.
    static func hash(_ str: String) -> UInt32 {
        var h: UInt32 = 2_166_136_261
        for unit in str.utf16 {
            h ^= UInt32(unit)
            h = h &* 16_777_619
        }
        return h
    }

    static func roundRectPoints(_ w: Double, _ h: Double, _ r: Double, step: Double = 14) -> [CGPoint] {
        let rr = min(r, w / 2, h / 2)
        var pts: [CGPoint] = []
        func line(_ x0: Double, _ y0: Double, _ x1: Double, _ y1: Double) {
            let n = max(1, Int((hypot(x1 - x0, y1 - y0) / step).rounded()))
            for i in 0..<n {
                let t = Double(i) / Double(n)
                pts.append(CGPoint(x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t))
            }
        }
        func arc(_ cx: Double, _ cy: Double, _ a0: Double, _ a1: Double) {
            let n = max(2, Int((abs(a1 - a0) * rr / step).rounded()))
            for i in 0..<n {
                let a = a0 + (a1 - a0) * Double(i) / Double(n)
                pts.append(CGPoint(x: cx + cos(a) * rr, y: cy + sin(a) * rr))
            }
        }
        line(rr, 0, w - rr, 0)
        arc(w - rr, rr, -.pi / 2, 0)
        line(w, rr, w, h - rr)
        arc(w - rr, h - rr, 0, .pi / 2)
        line(w - rr, h, rr, h)
        arc(rr, h - rr, .pi / 2, .pi)
        line(0, h - rr, 0, rr)
        arc(rr, rr, .pi, .pi * 1.5)
        return pts
    }

    static func circlePoints(_ c: CGPoint, _ r: Double, n: Int = 26) -> [CGPoint] {
        (0..<n).map { i in
            let a = Double(i) / Double(n) * .pi * 2
            return CGPoint(x: c.x + cos(a) * r, y: c.y + sin(a) * r)
        }
    }

    /// A pen wanders, it does not vibrate.
    static func jitter(_ pts: [CGPoint], seed: UInt32, amp: Double) -> [CGPoint] {
        var rnd = Seeded(seed)
        var ox = 0.0, oy = 0.0
        return pts.map { p in
            ox = ox * 0.55 + (rnd.next() * 2 - 1) * amp * 0.9
            oy = oy * 0.55 + (rnd.next() * 2 - 1) * amp * 0.9
            return CGPoint(x: p.x + ox, y: p.y + oy)
        }
    }

    /// Catmull-Rom through the points, as cubic beziers.
    static func smooth(_ pts: [CGPoint], closed: Bool = true) -> Path {
        var path = Path()
        guard pts.count > 1 else { return path }
        func at(_ i: Int) -> CGPoint {
            closed ? pts[(i % pts.count + pts.count) % pts.count] : pts[max(0, min(pts.count - 1, i))]
        }
        path.move(to: pts[0])
        for i in 0..<(closed ? pts.count : pts.count - 1) {
            let p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
            path.addCurve(
                to: p2,
                control1: CGPoint(x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6),
                control2: CGPoint(x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6)
            )
        }
        if closed { path.closeSubpath() }
        return path
    }
}

/// A rounded rectangle as a hand would draw it. `pass` 0 is the main stroke,
/// 1 the lighter second go-over that keeps a single line from looking printed.
nonisolated struct RoughRect: Shape {
    var seed: UInt32
    var radius: Double = 16
    var amp: Double = 1.8
    var pass = 0

    func path(in rect: CGRect) -> Path {
        // Snapped, so a resizing window does not re-roll the wobble every frame.
        let w = max(16, (rect.width / 8).rounded() * 8) - 4
        let h = max(16, (rect.height / 8).rounded() * 8) - 4
        let pts = Rough.roundRectPoints(w, h, radius)
        let s = seed &+ UInt32(pass) &* 7919
        return Rough.smooth(Rough.jitter(pts, seed: s, amp: amp * (pass == 0 ? 1 : 0.75)))
            .applying(CGAffineTransform(scaleX: (rect.width - 4) / w, y: (rect.height - 4) / h))
            .offsetBy(dx: rect.minX + 2, dy: rect.minY + 2)
    }
}

nonisolated struct RoughCircle: Shape {
    var seed: UInt32
    var amp: Double = 1.2
    var pass = 0

    func path(in rect: CGRect) -> Path {
        let r = min(rect.width, rect.height) / 2 - 1.5
        let pts = Rough.circlePoints(CGPoint(x: rect.midX, y: rect.midY), r)
        return Rough.smooth(Rough.jitter(pts, seed: seed &+ UInt32(pass) &* 7919, amp: amp * (pass == 0 ? 1 : 0.75)))
    }
}

/// The inked outline every card on the site has: two passes of the same pen.
struct RoughBorder: View {
    var key: String
    var radius: Double = 16
    var lineWidth: Double = 1.6
    var color: Color
    var opacity: Double = 0.5

    var body: some View {
        let seed = Rough.hash(key)
        ZStack {
            RoughRect(seed: seed, radius: radius, pass: 0)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round))
            RoughRect(seed: seed, radius: radius, pass: 1)
                .stroke(color.opacity(0.55), style: StrokeStyle(lineWidth: lineWidth * 0.65, lineCap: .round, lineJoin: .round))
        }
        .opacity(opacity)
        .allowsHitTesting(false)
    }
}
