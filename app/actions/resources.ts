"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const RESOURCES_BUCKET = "resources";

export async function uploadResource(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;
  if (!title) throw new Error("Title is required");
  if (!file || file.size === 0) throw new Error("A file is required");

  const path = `${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrl } = supabase.storage.from(RESOURCES_BUCKET).getPublicUrl(path);

  const { count } = await supabase
    .from("resources")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("resources").insert({
    title,
    file_name: file.name,
    file_url: publicUrl.publicUrl,
    sort_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}

export async function deleteResource(resourceId: string) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase.from("resources").delete().eq("id", resourceId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}
