import Supabase
import SwiftUI

/// Edit profile, like the web's /app/settings: photo, handle, name, bio,
/// link and the private switch; then sign out, links to the web's pages,
/// and account deletion.
struct SettingsView: View {
  private enum Field { case handle, name, bio, link }

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router

  @State private var loaded: Profile?
  @State private var avatarURL: URL?
  @State private var handle = ""
  @State private var name = ""
  @State private var bio = ""
  @State private var link = ""
  @State private var isPrivate = false
  @State private var saving = false
  @State private var status: (ok: Bool, text: String)?
  @State private var deleting = false
  @FocusState private var focus: Field?

  var body: some View {
    Screen(title: "Edit profile") {
      if let profile = loaded, let userId = session.userId {
        form(profile, userId: userId)
        accountSection
        deleteSection(profile)
      } else {
        LoadingText()
      }
    }
    .scrollDismissesKeyboard(.interactively)
    .task { await load() }
    .sheet(isPresented: $deleting) {
      if let profile = loaded { DeleteAccountSheet(handle: profile.handle) }
    }
  }

  private func form(_ profile: Profile, userId: UUID) -> some View {
    VStack(alignment: .leading, spacing: Space.xl) {
      AvatarPicker(userId: userId, name: name.isEmpty ? handle : name, url: $avatarURL)

      FormField(
        label: "Handle", message: handleProblem ?? "Your profile is at /@\(handle.isEmpty ? "handle" : handle).",
        isError: handleProblem != nil
      ) {
        HStack(spacing: 2) {
          Text(verbatim: "@").foregroundStyle(Palette.labelSecondary).accessibilityHidden(true)
          TextField("Handle", text: $handle, prompt: Text(verbatim: "sillyelphaba"))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .focused($focus, equals: .handle)
            .onChange(of: handle) { _, value in
              let normalized = String(ProfileRules.normalizeHandle(value).prefix(20))
              if normalized != value { handle = normalized }
            }
        }
        .fieldStyle()
      }

      FormField(label: "Name") {
        TextField("Name", text: $name, prompt: Text("Your name"))
          .textContentType(.name)
          .focused($focus, equals: .name)
          .onChange(of: name) { _, v in if v.count > ProfileRules.nameMax { name = String(v.prefix(ProfileRules.nameMax)) } }
          .fieldStyle()
      }

      FormField(label: "Bio", optional: true, counter: "\(bio.count)/\(ProfileRules.bioMax)") {
        TextField("Bio", text: $bio, prompt: Text("Musicals, mostly. Always the front row."), axis: .vertical)
          .lineLimit(3, reservesSpace: true)
          .focused($focus, equals: .bio)
          .onChange(of: bio) { _, v in if v.count > ProfileRules.bioMax { bio = String(v.prefix(ProfileRules.bioMax)) } }
          .padding(.vertical, Space.m)
          .fieldStyle()
      }

      FormField(label: "Link", optional: true) {
        TextField("Link", text: $link, prompt: Text(verbatim: "instagram.com/yourname"))
          .keyboardType(.URL)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
          .focused($focus, equals: .link)
          .fieldStyle()
      }

      Toggle(isOn: $isPrivate) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Private profile").font(.stubBody.weight(.medium)).foregroundStyle(Palette.label)
          Text("Only you and followers you approve see your shows, trips and stats. Others see your handle, name, bio and link.")
            .font(.stubFootnote)
            .foregroundStyle(Palette.labelSecondary)
        }
      }
      .tint(Palette.tint)
      .padding(Space.l)
      .cardStyle()
      if profile.isPrivate, !isPrivate {
        Text("Going public approves any follow requests waiting for you.")
          .font(.stubFootnote)
          .foregroundStyle(Palette.labelSecondary)
      }

      if let status {
        Text(status.text)
          .font(.stubFootnote)
          .foregroundStyle(status.ok ? Palette.labelSecondary : Palette.destructive)
      }
      Button(saving ? "Saving…" : "Save") { Task { await save(userId: userId) } }
        .buttonStyle(.primary)
        .disabled(saving || handleProblem != nil)
    }
  }

  private var accountSection: some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach([("Privacy", "privacy"), ("Terms", "terms"), ("FAQ", "faq")], id: \.1) { title, path in
        Link(destination: AppConfig.current.webURL.appendingPathComponent(path)) {
          HStack {
            Text(title).foregroundStyle(Palette.label)
            Spacer()
            Image(systemName: "arrow.up.right").foregroundStyle(Palette.labelSecondary)
          }
          .font(.stubBody)
          .padding(.horizontal, Space.l)
          .frame(minHeight: 50)
        }
        Palette.separator.frame(height: 1).padding(.leading, Space.l)
      }
      Button {
        Task { await session.signOut() }
      } label: {
        Text("Sign out")
          .font(.stubBody)
          .foregroundStyle(Palette.tintText)
          .padding(.horizontal, Space.l)
          .frame(maxWidth: .infinity, minHeight: 50, alignment: .leading)
      }
    }
    .cardStyle()
  }

  private func deleteSection(_ profile: Profile) -> some View {
    VStack(alignment: .leading, spacing: Space.s) {
      Text("Delete account")
        .font(.stubTitle2)
        .foregroundStyle(Palette.label)
        .accessibilityAddTraits(.isHeader)
      Text("Permanently delete your profile, diary, trips and photos. This can’t be undone.")
        .font(.stubSubheadline)
        .foregroundStyle(Palette.labelSecondary)
      Button("Delete account") { deleting = true }
        .buttonStyle(PillButtonStyle())
        .foregroundStyle(Palette.destructive)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.top, Space.xl)
    .overlay(alignment: .top) { Palette.separator.frame(height: 1) }
  }

  private var handleProblem: String? {
    guard let loaded else { return nil }
    if handle == loaded.handle { return nil }
    return ProfileRules.handleProblem(handle)
  }

  private func load() async {
    guard loaded == nil, let userId = session.userId, let profile = try? await Profiles.profile(userId) else { return }
    loaded = profile
    avatarURL = profile.avatarURL
    handle = profile.handle
    name = profile.displayName ?? ""
    bio = profile.bio ?? ""
    link = profile.link ?? ""
    isPrivate = profile.isPrivate
  }

  private func save(userId: UUID) async {
    status = nil
    let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
    let trimmedBio = bio.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalizedLink = ProfileRules.normalizeLink(link)
    if !link.trimmingCharacters(in: .whitespaces).isEmpty, normalizedLink == nil {
      return status = (false, "That doesn’t look like a web link.")
    }
    saving = true
    defer { saving = false }
    struct Update: Encodable {
      let handle: String
      let display_name: String?
      let bio: String?
      let link: String?
      let is_private: Bool
    }
    do {
      try await supabase.from("profiles")
        .update(
          Update(
            handle: handle, display_name: trimmedName.isEmpty ? nil : trimmedName, bio: trimmedBio.isEmpty ? nil : trimmedBio,
            link: normalizedLink, is_private: isPrivate)
        )
        .eq("id", value: userId).execute()
      loaded = try? await Profiles.profile(userId)
      status = (true, isPrivate ? "Saved. Your profile is private." : "Saved. Your profile is public.")
      router.dataChanged()
    } catch {
      if ProfileRules.isTakenError(error) {
        status = (false, "That handle is taken.")
      } else if ProfileRules.isReservedError(error) {
        status = (false, "That handle is reserved. Try another.")
      } else {
        status = (false, "Couldn’t save. Try again.")
      }
    }
  }
}

/// Deletes the account once you type your handle: photos first, then the
/// account (delete_my_account), then you're signed out.
struct DeleteAccountSheet: View {
  let handle: String

  @Environment(AppSession.self) private var session
  @Environment(\.dismiss) private var dismiss
  @State private var typed = ""
  @State private var busy = false
  @State private var error: String?

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: Space.l) {
        Text("Delete your account?")
          .font(.stubTitle2)
          .foregroundStyle(Palette.label)
        Text("This permanently deletes your profile, diary, trips, photos, follows, likes and comments.")
          .font(.stubSubheadline)
          .foregroundStyle(Palette.labelSecondary)
        FormField(label: "Type your handle, @\(handle), to confirm", message: error, isError: true) {
          TextField("Confirm handle", text: $typed, prompt: Text(verbatim: handle))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .fieldStyle()
        }
        Button(busy ? "Deleting…" : "Delete account") { Task { await delete() } }
          .buttonStyle(DestructiveButtonStyle())
          .disabled(busy || ProfileRules.normalizeHandle(typed) != handle.lowercased())
          .accessibilityIdentifier("confirm-delete-account")
        Spacer()
      }
      .padding(Space.l)
      .background(Palette.background)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
      }
    }
    .presentationDetents([.medium, .large])
    .interactiveDismissDisabled(busy)
  }

  private func delete() async {
    guard let userId = session.userId else { return }
    let confirm = ProfileRules.normalizeHandle(typed)
    guard confirm == handle.lowercased() else { return error = "That doesn’t match your handle." }
    busy = true
    defer { busy = false }
    error = nil
    // Both buckets keep each user's files under `{user_id}/`.
    let folder = userId.uuidString.lowercased()
    for bucket in [Entries.photoBucket, Avatars.bucket] {
      let storage = supabase.storage.from(bucket)
      while true {
        guard let files = try? await storage.list(path: folder, options: SearchOptions(limit: 1000)) else {
          return error = "Couldn’t delete your photos. Try again."
        }
        if files.isEmpty { break }
        guard let removed = try? await storage.remove(paths: files.map { "\(folder)/\($0.name)" }), !removed.isEmpty else {
          return error = "Couldn’t delete your photos. Try again."
        }
      }
    }
    do {
      try await supabase.rpc("delete_my_account", params: ["confirm": confirm]).execute()
    } catch {
      Log.data.error("delete_my_account failed: \(error.localizedDescription, privacy: .public)")
      return self.error = "Couldn’t delete your account. Try again."
    }
    session.accountDeleted()
  }
}

/// A filled destructive capsule, for the final step of a deletion.
struct DestructiveButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.stubHeadline)
      .foregroundStyle(.white)
      .frame(maxWidth: .infinity, minHeight: 50)
      .background(Palette.destructive.opacity(configuration.isPressed ? 0.8 : 1), in: .capsule)
  }
}
