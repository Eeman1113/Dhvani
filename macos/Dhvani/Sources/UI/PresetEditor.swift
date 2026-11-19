import SwiftUI

/// Everything a preset holds, editable, without touching what is playing
/// until "Try it" or "Save and play" says so.
struct PresetEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.paper) private var paper
    @Environment(\.dismiss) private var dismiss

    @State var draft: Preset
    @State private var includeMaster = true
    @State private var includePaper = true
    @State private var pickingIcon = false

    init(draft: Preset) {
        _draft = State(initialValue: draft)
        _includeMaster = State(initialValue: draft.master != nil)
        _includePaper = State(initialValue: draft.theme != nil)
    }

    private var isNew: Bool { !model.presets.user.contains { $0.id == draft.id } }
    private var trimmedName: String { draft.name.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(isNew ? "New preset" : "Edit preset").font(.hand(28, weight: .semibold))
                Text("下地").font(.zen(13)).foregroundStyle(paper.accentText)
                Spacer()
            }
            .padding([.horizontal, .top], 22)
            .padding(.bottom, 8)

            Form {
                Section {
                    HStack(alignment: .top, spacing: 14) {
                        Button { pickingIcon.toggle() } label: {
                            Doodle(name: faceOf(draft, in: model.catalogue), active: true)
                                .frame(width: 46, height: 46)
                                .padding(8)
                        }
                        .buttonStyle(.plain)
                        .inkCard("editor-icon-\(draft.id)", radius: 14, interactive: true)
                        .help("Choose a drawing")
                        .popover(isPresented: $pickingIcon) { iconPicker }

                        VStack(spacing: 8) {
                            TextField("Name", text: $draft.name, prompt: Text("Deep Work, Rainy Sunday…"))
                            TextField("Japanese (optional)", text: $draft.jp, prompt: Text("集中"))
                            TextField("Description (optional)", text: $draft.blurb, prompt: Text("rain, a fan, and someone else typing"))
                        }
                    }
                }

                Section("Sounds") {
                    if draft.mix.isEmpty {
                        Text("No sounds yet.").foregroundStyle(.secondary)
                    }
                    ForEach(model.catalogue.sounds.filter { draft.mix[$0.id] != nil }) { s in
                        HStack(spacing: 10) {
                            Doodle(name: s.doodle, active: true).frame(width: 22, height: 22)
                            Text(s.name).frame(width: 130, alignment: .leading)
                            Slider(value: Binding(get: { draft.mix[s.id] ?? 0 }, set: { draft.mix[s.id] = max($0, 0.01) }), in: 0...1)
                                .accessibilityLabel("\(s.name) level")
                            Text("\(Int((draft.mix[s.id] ?? 0) * 100))").monospacedDigit().frame(width: 28, alignment: .trailing).foregroundStyle(.secondary)
                            Button { draft.mix[s.id] = nil } label: { Image(systemName: "minus.circle.fill") }
                                .buttonStyle(.borderless)
                                .foregroundStyle(.secondary)
                                .accessibilityLabel("Remove \(s.name)")
                        }
                    }
                    HStack {
                        Menu {
                            ForEach(model.catalogue.groups) { g in
                                Menu("\(g.name) \(g.jp)") {
                                    ForEach(model.catalogue.sounds(in: g).filter { draft.mix[$0.id] == nil }) { s in
                                        Button(s.isRecording ? "\(s.name) 録" : s.name) { draft.mix[s.id] = s.defaultLevel }
                                    }
                                }
                            }
                        } label: {
                            Label("Add a sound", systemImage: "plus")
                        }
                        .fixedSize()
                        Spacer()
                        Button("Use what's playing now") {
                            draft.mix = model.levels
                            draft.music = model.music
                            draft.master = model.master
                        }
                        .disabled(!model.hasMix)
                    }
                }

                Section("Music") {
                    Picker("Deck", selection: Binding(
                        get: { draft.music?.mode },
                        set: { mode in draft.music = mode.map { MusicSetting(mode: $0, level: draft.music?.level ?? 0.5) } }
                    )) {
                        Text("None").tag(MusicMode?.none)
                        ForEach(MusicMode.allCases) { Text("\($0.name) \($0.jp)").tag(MusicMode?.some($0)) }
                    }
                    if draft.music != nil {
                        Slider(value: Binding(get: { draft.music?.level ?? 0.5 }, set: { draft.music?.level = $0 }), in: 0...1) {
                            Text("Level")
                        }
                    }
                }

                Section("Also set") {
                    Toggle("Master volume", isOn: $includeMaster)
                    if includeMaster {
                        Slider(value: Binding(get: { draft.master ?? model.master }, set: { draft.master = $0 }), in: 0...1) {
                            Text("Volume")
                        }
                    }
                    Toggle("Paper", isOn: $includePaper)
                    if includePaper {
                        Picker("Paper", selection: Binding(get: { draft.theme ?? model.themeID }, set: { draft.theme = $0 })) {
                            ForEach(model.catalogue.themes) { t in Text("\(t.name) \(t.jp)").tag(t.id) }
                        }
                    }
                }
            }
            .formStyle(.grouped)
            .scrollContentBackground(.hidden)

            HStack {
                if !isNew {
                    Button("Delete", role: .destructive) {
                        model.presets.delete(draft.id)
                        dismiss()
                    }
                }
                Spacer()
                Button("Try it") { model.apply(finished) }
                    .disabled(draft.mix.isEmpty && draft.music == nil)
                    .help("Play this without saving")
                Button("Cancel", role: .cancel) { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Save and play") {
                    model.presets.save(finished)
                    model.apply(finished)
                    dismiss()
                }
                .buttonStyle(.glassProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(trimmedName.isEmpty || (draft.mix.isEmpty && draft.music == nil))
            }
            .padding(18)
        }
        .frame(width: 560, height: 660)
        .background(PaperBackdrop())
        .foregroundStyle(paper.ink)
    }

    private var finished: Preset {
        var p = draft
        p.name = trimmedName.isEmpty ? "Untitled mix" : trimmedName
        p.master = includeMaster ? (draft.master ?? model.master) : nil
        p.theme = includePaper ? (draft.theme ?? model.themeID) : nil
        p.mix = p.mix.filter { $0.value > 0 }
        return p
    }

    private var iconPicker: some View {
        let names = Array(Set(model.catalogue.sounds.map(\.doodle) + ["cassette", "nocturne"])).sorted()
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Drawing").font(.hand(20, weight: .semibold))
                Spacer()
                Button("Loudest sound") {
                    draft.icon = nil
                    pickingIcon = false
                }
                .controlSize(.small)
            }
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(40), spacing: 6), count: 7), spacing: 6) {
                    ForEach(names, id: \.self) { n in
                        Button {
                            draft.icon = n
                            pickingIcon = false
                        } label: {
                            Doodle(name: n, active: draft.icon == n)
                                .frame(width: 30, height: 30)
                                .padding(5)
                                .background(draft.icon == n ? paper.wash : .clear, in: .rect(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(n)
                    }
                }
            }
            .frame(height: 240)
        }
        .padding(14)
        .frame(width: 336)
    }
}
