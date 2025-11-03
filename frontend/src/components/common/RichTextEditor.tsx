import React, { useMemo } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import ImageResize from "quill-image-resize-module-react";

// Register the image resize module once
Quill.register("modules/imageResize", ImageResize);

interface Props {
  value: string;
  onChange: (val: string) => void;
}

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

export default function RichTextEditor({ value, onChange }: Props) {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: function imageHandler(this: any) {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.click();

            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              const formData = new FormData();
              formData.append("image", file);

              try {
                const response = await fetch(`${API_BASE}/api/upload/image`, {
                  method: "POST",
                  body: formData,
                });
                const data = await response.json();

                if (!response.ok || !data?.url) {
                  throw new Error(data?.message || "Upload image failed");
                }

                const range = this.quill.getSelection(true);
                this.quill.insertEmbed(range.index, "image", data.url, "user");
                this.quill.setSelection(range.index + 1);
              } catch (error) {
                console.error("Image upload error:", error);
                alert("Không thể tải ảnh, vui lòng thử lại.");
              }
            };
          },
        },
      },
      imageResize: { parchment: Quill.import("parchment") },
    }),
    []
  );

  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder="Nhập nội dung bài viết, chèn ảnh, định dạng văn bản..."
      style={{ height: "320px", marginBottom: "1rem" }}
    />
  );
}

