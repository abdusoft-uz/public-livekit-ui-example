# GitHub Repository Setup - Qo'llanma

## 📋 GitHub'da Repository Yaratish

GitHub'da yangi repository yaratish uchun:

1. **GitHub'ga kiring**: https://github.com/orgs/abdusoft-uz
2. **Yangi repository yarating**:
   - "New repository" tugmasini bosing
   - Repository name: `public-livekit-ui-example`
   - Description: `Modern LiveKit UI Example for bitHuman AI Agents`
   - Visibility: **Public** ✅
   - **README yaratmang** (bizda allaqachon bor)
   - **.gitignore yaratmang** (bizda allaqachon bor)
   - **License yaratmang** (keyin qo'shish mumkin)
3. **"Create repository" tugmasini bosing**

## 🚀 Local Repository'ni Push Qilish

Repository yaratilgandan keyin quyidagi buyruqlarni bajaring:

```bash
# Remote'ni yangilash (agar allaqachon qilgan bo'lsangiz, bu qadamni o'tkazib yuborishingiz mumkin)
git remote set-url origin https://github.com/abdusoft-uz/public-livekit-ui-example.git

# Barcha o'zgarishlarni qo'shish
git add .

# Commit yaratish
git commit -m "feat: Update to chat interface, add agent worker job submission, optimize UI"

# Main branch'ga push qilish
git push -u origin main
```

## ⚠️ Eslatmalar

- Agar repository avval yaratilmagan bo'lsa, push xato beradi
- Avval GitHub'da repository yaratilganligiga ishonch hosil qiling
- Agar authentication muammosi bo'lsa, GitHub token yoki SSH key sozlang

