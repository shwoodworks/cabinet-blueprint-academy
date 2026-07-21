"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const MATERIALS_BUCKET = "materials";

export async function createCourse(formData: FormData) {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const { data, error } = await supabase
    .from("courses")
    .insert({ title, description: description || null, created_by: admin.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const { error } = await supabase
    .from("courses")
    .update({ title, description: description || null })
    .eq("id", courseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
}

export async function setCoursePublished(courseId: string, isPublished: boolean) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ is_published: isPublished })
    .eq("id", courseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
}

export async function createModule(courseId: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const { count } = await supabase
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { error } = await supabase
    .from("modules")
    .insert({ course_id: courseId, title, sequence_order: (count ?? 0) + 1 });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function setModulePublished(courseId: string, moduleId: string, isPublished: boolean) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("modules")
    .update({ is_published: isPublished })
    .eq("id", moduleId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`);
}

export async function reorderModule(courseId: string, moduleId: string, direction: "up" | "down") {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: modules, error } = await supabase
    .from("modules")
    .select("id, sequence_order")
    .eq("course_id", courseId)
    .order("sequence_order", { ascending: true });

  if (error) throw new Error(error.message);

  const index = modules.findIndex((m) => m.id === moduleId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= modules.length) return;

  const a = modules[index];
  const b = modules[swapIndex];

  await supabase.from("modules").update({ sequence_order: b.sequence_order }).eq("id", a.id);
  await supabase.from("modules").update({ sequence_order: a.sequence_order }).eq("id", b.id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createTextMaterial(courseId: string, moduleId: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Content is required");

  const { count } = await supabase
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { error } = await supabase
    .from("materials")
    .insert({ module_id: moduleId, type: "text", body, sequence_order: (count ?? 0) + 1 });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`);
}

export async function createFileMaterial(courseId: string, moduleId: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("A file is required");

  const type = file.type === "application/pdf" ? "pdf" : "image";
  const path = `${moduleId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrl } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(path);

  const { count } = await supabase
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { error } = await supabase.from("materials").insert({
    module_id: moduleId,
    type,
    file_url: publicUrl.publicUrl,
    sequence_order: (count ?? 0) + 1,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`);
}

export async function deleteMaterial(courseId: string, moduleId: string, materialId: string) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase.from("materials").delete().eq("id", materialId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`);
}
