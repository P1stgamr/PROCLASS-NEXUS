import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { ref, update } from "firebase/database";
import { auth, db, storage } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/roles";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, GraduationCap, School, UserRound } from "lucide-react";

const GRADES = ["6", "7", "8", "9", "10", "SSC", "HSC"];

export default function ProfileSetupPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const lockedRole = userProfile?.role && !["student", "teacher"].includes(userProfile.role);
  const [role, setRole] = useState<"student" | "teacher">(
    userProfile?.role === "teacher" ? "teacher" : "student",
  );
  const [name, setName] = useState(userProfile?.name || currentUser?.displayName || "");
  const [grade, setGrade] = useState(userProfile?.grade || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [schoolName, setSchoolName] = useState(userProfile?.schoolName || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(userProfile?.photoURL || currentUser?.photoURL || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    setRole(userProfile.role === "teacher" ? "teacher" : "student");
    setName(userProfile.name || currentUser?.displayName || "");
    setGrade(userProfile.grade || "");
    setPhone(userProfile.phone || "");
    setSchoolName(userProfile.schoolName || "");
    setPhotoPreview(userProfile.photoURL || currentUser?.photoURL || "");
  }, [userProfile, currentUser]);

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be smaller than 5MB", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    if (!name.trim() || !phone.trim() || !schoolName.trim() || (!lockedRole && role === "student" && !grade) || (!photoPreview && !photoFile)) {
      toast({ title: "Complete your profile first", description: "Name, phone, school, class (for students), and a profile picture are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let photoURL = photoPreview || null;
      if (photoFile) {
        const uploaded = await uploadBytes(storageRef(storage, `profile-pictures/${currentUser.uid}/${Date.now()}-${photoFile.name}`), photoFile);
        photoURL = await getDownloadURL(uploaded.ref);
      }
      const finalRole = lockedRole ? userProfile!.role : role;
      await updateProfile(currentUser, { displayName: name.trim(), photoURL });
      await update(ref(db, `users/${currentUser.uid}`), {
        name: name.trim(),
        role: finalRole,
        phone: phone.trim(),
        schoolName: schoolName.trim(),
        grade: finalRole === "student" ? grade : null,
        photoURL,
        profileComplete: true,
        profileCompletedAt: Date.now(),
      });
      toast({ title: "Profile setup complete ✅" });
      setLocation(finalRole === "teacher" ? "/community" : "/home");
    } catch (error: any) {
      toast({ title: "Could not save profile", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-8">
      <form onSubmit={submit} className="w-full max-w-md glass-card rounded-3xl border border-white/10 p-6 space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <UserRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold">Complete your profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Finish setup before entering TaskMint Pro.</p>
        </div>

        <div className="flex justify-center">
          <label className="relative cursor-pointer">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-primary/40 bg-primary/10 flex items-center justify-center">
              {photoPreview ? <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-primary" />}
            </div>
            <span className="absolute -bottom-2 -right-2 rounded-full bg-primary p-2"><Camera className="w-3.5 h-3.5 text-white" /></span>
            <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="space-y-3">
          <div><Label>Full name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-white/5 border-white/10" /></div>
          {lockedRole ? (
            <div><Label>Account role</Label><div className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">{roleLabel(userProfile?.role)}</div></div>
          ) : (
            <div>
              <Label>Choose your role *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["student", "teacher"] as const).map((value) => (
                  <button type="button" key={value} onClick={() => setRole(value)} className={`rounded-xl border p-3 text-left ${role === value ? "border-primary bg-primary/15" : "border-white/10 bg-white/5"}`}>
                    <p className="font-semibold text-sm">{value === "student" ? "Student" : "Teacher"}</p>
                    <p className="text-[10px] text-muted-foreground">{value === "student" ? "Learn, practice and compete" : "Build a community"}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!lockedRole && role === "student" && (
            <div><Label>Class / Grade *</Label><select value={grade} onChange={(e) => setGrade(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm"><option value="">Select class</option>{GRADES.map((value) => <option key={value} value={value}>{value === "SSC" || value === "HSC" ? value : `Class ${value}`}</option>)}</select></div>
          )}
          <div><Label>Phone number *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" className="mt-1 bg-white/5 border-white/10" /></div>
          <div><Label>School / Academy name *</Label><div className="relative mt-1"><School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="pl-10 bg-white/5 border-white/10" /></div></div>
        </div>
        <GlowButton type="submit" className="w-full h-12" disabled={saving}>{saving ? "Saving profile…" : "Continue to TaskMint Pro"}</GlowButton>
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><GraduationCap className="w-3.5 h-3.5" />You can update these details later in Settings.</div>
      </form>
    </div>
  );
}