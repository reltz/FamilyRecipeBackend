# Control Lambda — Manual Invocation Reference

Invoke from AWS Console: **Lambda → select the control function → Test tab → paste the JSON below**.

---

## 1. Create Secret

Generates the EC key pair used to sign/verify JWTs. Run this once on first setup.

```json
{
  "operation": "secret",
  "action": "create"
}
```

---

## 2. Create Family

Creates a new family entry. Note the returned `familyId` from the logs — you'll need it when creating users.

```json
{
  "operation": "family",
  "action": "create",
  "familyName": "Silva"
}
```

---

## 3. Create User

Creates a new user and associates them with an existing family.

```json
{
  "operation": "user",
  "action": "create",
  "username": "joao",
  "password": "initial-password",
  "familyId": "eadb731a-bd9e-4c28-a53c-fd4aa455818d",
  "familyName": "Silva"
}
```

> `familyId` must match an existing family. `familyName` is stored on the user record for convenience.

---

## 4. Update User Password (admin reset)

Resets a user's password without needing the old one. Useful for recovering test accounts.

```json
{
  "operation": "user",
  "action": "update-password",
  "username": "joao",
  "newPassword": "new-password"
}
```
