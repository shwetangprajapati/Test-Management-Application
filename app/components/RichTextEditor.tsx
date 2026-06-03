"use client";

import { Editor } from "@tinymce/tinymce-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder = "Type here...", height = 300, disabled = false }: RichTextEditorProps) {
  return (
    <Editor
      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
      // Controlled only: passing initialValue too makes every keystroke hit the
      // resetContent branch in tinymce-react, which resets the cursor to the start
      // and types text in reverse. value alone uses the cursor-preserving path.
      value={value}
      onEditorChange={(content) => onChange(content)}
      disabled={disabled}
      init={{
        height,
        menubar: false,
        placeholder,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic underline strikethrough | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'image media | removeformat | help',
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px }',
        skin: 'oxide',
        content_css: 'default',
        branding: false,
        promotion: false,
        toolbar_mode: 'sliding'
      }}
    />
  );
}

export default RichTextEditor;