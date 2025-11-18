import { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';

type QuillWithFlag = typeof Quill & { __imageResizeRegistered?: boolean };
const QuillWithFlag = Quill as QuillWithFlag;
if (!QuillWithFlag.__imageResizeRegistered) {
  QuillWithFlag.register('modules/imageResize', ImageResize);
  QuillWithFlag.__imageResizeRegistered = true;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5001';

type ImageHandlerContext = {
  quill: {
    getSelection: (focus?: boolean) => { index: number } | null;
    insertEmbed: (index: number, type: string, value: string, source: string) => void;
    setSelection: (index: number, length?: number) => void;
  };
};

export default function RichTextEditor({ value, onChange }: Props) {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ],
        handlers: {
          image: function imageHandler(this: ImageHandlerContext) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.click();

            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              const formData = new FormData();
              formData.append('image', file);

              try {
                const response = await fetch(`${API_BASE}/api/upload/image`, {
                  method: 'POST',
                  body: formData
                });
                const data = await response.json();

                if (!response.ok || !data?.url) {
                  throw new Error(data?.message || 'Upload image failed');
                }

                const range = this.quill.getSelection(true);
                if (!range) return;
                this.quill.insertEmbed(range.index, 'image', data.url, 'user');
                this.quill.setSelection(range.index + 1);
              } catch (error) {
                console.error('Image upload error:', error);
                alert('Khong the tai anh, vui long thu lai.');
              }
            };
          }
        }
      },
      imageResize: { parchment: Quill.import('parchment') }
    }),
    []
  );

  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder="Nhap noi dung bai viet, chon anh, dinh dang van ban..."
      style={{ height: '320px', marginBottom: '1rem' }}
    />
  );
}
