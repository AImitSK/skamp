// src/app/dashboard/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Avatar } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <Heading>Profil</Heading>
      <Text className="mt-2">
        Verwalte deine persönlichen Informationen und Einstellungen
      </Text>

      <Divider className="my-8" />

      {/* Avatar Bereich */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar
          className="size-20"
          src={user?.photoURL}
          initials={
            user?.displayName
              ? user.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : user?.email?.[0].toUpperCase()
          }
        />
        <div>
          <Subheading level={3}>Profilbild</Subheading>
          <Text className="mt-1">
            Profilbild-Upload wird bald verfügbar sein
          </Text>
        </div>
      </div>

      {/* Formular */}
      <FieldGroup>
        <Field>
          <Label>E-Mail-Adresse</Label>
          <Input type="email" value={user?.email || ""} disabled />
          <Text className="mt-2">
            Deine E-Mail-Adresse kann nicht geändert werden
          </Text>
        </Field>

        <Field>
          <Label>Anzeigename</Label>
          <Input
            type="text"
            defaultValue={user?.displayName || ""}
            placeholder="Dein Name"
          />
        </Field>

        <Field>
          <Label>Telefonnummer</Label>
          <Input type="tel" placeholder="+49 123 456789" />
        </Field>
      </FieldGroup>

      <div className="mt-8 flex gap-3">
        <Button color="indigo">Änderungen speichern</Button>
        <Button plain>Abbrechen</Button>
      </div>

      <Divider className="my-8" />

      {/* Account-Informationen */}
      <div>
        <Subheading level={3}>Account-Informationen</Subheading>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">User ID:</span>{" "}
            <span className="font-mono text-xs">{user?.uid}</span>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">
              E-Mail verifiziert:
            </span>{" "}
            {user?.emailVerified ? "✓ Ja" : "✗ Nein"}
          </div>
        </div>
      </div>
    </div>
  );
}