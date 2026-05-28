import { useState } from "react";
import { motion } from "framer-motion";
import { ref as dbRef, push } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Image, X } from "lucide-react";

const CATEGORIES = ["Math", "Science", "Programming", "English", "History", "Geography", "Other"];

export default function UploadPage() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnail(f);
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !currentUser) return;
    setUploading(true);
    try {
      let fileURL = null;
      let thumbnailURL = null;

      if (file) {
        const fileRef = storageRef(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
        const task = uploadBytesResumable(fileRef, file);
        await new Promise<void>((resolve, reject) => {
          task.on("state_changed",
            (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 80)),
            reject,
            async () => { fileURL = await getDownloadURL(task.snapshot.ref); resolve(); }
          );
        });
      }

      if (thumbnail) {
        setUploadProgress(85);
        const thumbRef = storageRef(storage, `thumbnails/${currentUser.uid}/${Date.now()}_${thumbnail.name}`);
        const snap = await uploadBytesResumable(thumbRef, thumbnail).then((t) => t);
        thumbnailURL = await getDownloadURL(thumbRef);
      }

      setUploadProgress(95);
      await push(dbRef(db, "tasks"), {
        title,
        description,
        category: category.toLowerCase(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        published,
        fileURL,
        thumbnailURL,
        uploadedBy: currentUser.uid,
        uploaderName: userProfile?.name || "Unknown",
        reward: 30,
        xpReward: 50,
        difficulty: "Medium",
        createdAt: Date.now(),
        status: published ? "published" : "draft",
      });

      setUploadProgress(100);
      toast({ title: "Upload successful!", description: "Your content has been submitted." });
      setTitle(""); setDescription(""); setTags(""); setCategory("");
      setFile(null); setThumbnail(null); setThumbnailPreview(null);
      setPublished(false); setUploadProgress(0);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Upload className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Upload Content</h1>
            <p className="text-xs text-muted-foreground">Share knowledge, earn coins</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter content title"
              className="h-12 bg-white/5 border-white/10"
              data-testid="input-title"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students will learn..."
              className="bg-white/5 border-white/10 resize-none h-24"
              data-testid="input-description"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10" data-testid="select-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="algebra, equations, practice"
              className="h-12 bg-white/5 border-white/10"
              data-testid="input-tags"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Thumbnail</Label>
            {thumbnailPreview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden">
                <img src={thumbnailPreview} className="w-full h-full object-cover" alt="Thumbnail" />
                <button
                  type="button"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                  onClick={() => { setThumbnail(null); setThumbnailPreview(null); }}
                  data-testid="btn-remove-thumbnail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-primary/50 transition-colors" data-testid="label-thumbnail">
                <Image className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Click to upload thumbnail</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
              </label>
            )}
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Study File (PDF, Video, etc.)</Label>
            {file ? (
              <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} data-testid="btn-remove-file">
                  <X className="w-4 h-4 text-muted-foreground hover:text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-primary/50 transition-colors" data-testid="label-file">
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Click to upload file</span>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          <div className="flex items-center justify-between p-4 glass-card rounded-xl">
            <div>
              <p className="font-medium text-sm">Publish immediately</p>
              <p className="text-xs text-muted-foreground">Make visible to all students</p>
            </div>
            <Switch checked={published} onCheckedChange={setPublished} data-testid="switch-publish" />
          </div>

          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <GlowButton
            type="submit"
            className="w-full h-12"
            disabled={uploading || !title || !category}
            data-testid="btn-upload-submit"
          >
            {uploading ? "Uploading..." : "Upload Content"}
          </GlowButton>
        </form>
      </div>
    </div>
  );
}
