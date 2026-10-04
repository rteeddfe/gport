"use client";

import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  Table as TableIcon,
  Plus,
  Minus,
  TableCellsMerge,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table as TableExtension } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

import { cn } from "@/lib/utils";
import { richContentClass } from "@/lib/rich-content";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "border-border grid size-8 place-items-center rounded-md border transition-colors",
        active
          ? "bg-raised text-brand border-brand/40"
          : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function toolbarAction(editor: Editor, run: () => void) {
  return () => run();
}

/** Rich-text editor for policy pages: h2/h3, bold/italic, lists, links and
 * tables (Tiptap). The value is HTML — the backend sanitizes it against a
 * whitelist before anything reaches the public pages. */
export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TableExtension.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  // Re-sync when the outer form swaps the document (switching policies).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <div className="border-border flex flex-wrap gap-1 border-b p-2">
        <ToolButton
          icon={Heading2}
          label="Заголовок h2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={toolbarAction(editor, () =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
          )}
        />
        <ToolButton
          icon={Heading3}
          label="Заголовок h3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={toolbarAction(editor, () =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
          )}
        />
        <ToolButton
          icon={Bold}
          label="Жирный"
          active={editor.isActive("bold")}
          onClick={toolbarAction(editor, () =>
            editor.chain().focus().toggleBold().run(),
          )}
        />
        <ToolButton
          icon={Italic}
          label="Курсив"
          active={editor.isActive("italic")}
          onClick={toolbarAction(editor, () =>
            editor.chain().focus().toggleItalic().run(),
          )}
        />
        <ToolButton
          icon={List}
          label="Маркированный список"
          active={editor.isActive("bulletList")}
          onClick={toolbarAction(editor, () =>
            editor.chain().focus().toggleBulletList().run(),
          )}
        />
        <ToolButton
          icon={ListOrdered}
          label="Нумерованный список"
          active={editor.isActive("orderedList")}
          onClick={toolbarAction(editor, () =>
            editor.chain().focus().toggleOrderedList().run(),
          )}
        />
        <ToolButton
          icon={Link2}
          label="Вставить ссылку"
          active={editor.isActive("link")}
          onClick={toolbarAction(editor, () => {
            const url = window.prompt("URL ссылки", editor.getAttributes("link").href ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().setLink({ href: url }).run();
          })}
        />
        {editor.isActive("link") ? (
          <ToolButton
            icon={Link2Off}
            label="Убрать ссылку"
            onClick={toolbarAction(editor, () =>
              editor.chain().focus().unsetLink().run(),
            )}
          />
        ) : null}

        <span className="bg-border mx-1 h-8 w-px self-center" aria-hidden />

        <ToolButton
          icon={TableIcon}
          label="Вставить таблицу"
          active={editor.isActive("table")}
          onClick={toolbarAction(editor, () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          )}
        />
        {editor.isActive("table") ? (
          <>
            <ToolButton
              icon={Plus}
              label="Добавить строку"
              onClick={toolbarAction(editor, () =>
                editor.chain().focus().addRowAfter().run(),
              )}
            />
            <ToolButton
              icon={Minus}
              label="Удалить строку"
              onClick={toolbarAction(editor, () =>
                editor.chain().focus().deleteRow().run(),
              )}
            />
            <ToolButton
              icon={Plus}
              label="Добавить столбец"
              onClick={toolbarAction(editor, () =>
                editor.chain().focus().addColumnAfter().run(),
              )}
            />
            <ToolButton
              icon={Minus}
              label="Удалить столбец"
              onClick={toolbarAction(editor, () =>
                editor.chain().focus().deleteColumn().run(),
              )}
            />
            <ToolButton
              icon={TableCellsMerge}
              label="Шапка таблицы"
              active={editor.isActive("tableHeader")}
              onClick={toolbarAction(editor, () =>
                editor.chain().focus().toggleHeaderRow().run(),
              )}
            />
            <ToolButton
              icon={Trash2}
              label="Удалить таблицу"
              onClick={toolbarAction(editor, () =>
                editor.chain().focus().deleteTable().run(),
              )}
            />
          </>
        ) : null}
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "bg-surface min-h-[340px] px-4 py-3 text-sm",
          "[&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-brand",
          richContentClass,
        )}
      />
    </div>
  );
}
