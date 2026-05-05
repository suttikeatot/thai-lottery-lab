import { notFound } from "next/navigation";
import { isLocale, getDictionary, t } from "@/lib/i18n";
import { ImportForm } from "@/components/ImportForm";

export default async function ImportPage({ params }: PageProps<"/[lang]/import">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const strings = {
    chooseFile: t(dict, "import.chooseFile"),
    upload: t(dict, "import.upload"),
    uploading: t(dict, "import.uploading"),
    successTitle: t(dict, "import.successTitle"),
    insertedRows: t(dict, "import.insertedRows"),
    skippedRows: t(dict, "import.skippedRows"),
    errorTitle: t(dict, "import.errorTitle"),
    errorRow: t(dict, "import.errorRow"),
    noFile: t(dict, "import.noFile"),
    uploadError: t(dict, "import.uploadError"),
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        {t(dict, "import.title")}
      </h1>
      <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">
        {t(dict, "import.description")}
      </p>
      <p className="mb-8 text-xs text-zinc-500 dark:text-zinc-500">
        {t(dict, "import.schemaNote")}
      </p>
      <ImportForm strings={strings} />
    </main>
  );
}
