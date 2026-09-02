import { AdminDataExplorer } from "@/components/admin/AdminDataExplorer";
import {
  isAdminTableName,
  type AdminTableName,
} from "@/lib/adminTables";

export default async function AdminDataPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table } = await searchParams;
  const initialTable: AdminTableName = isAdminTableName(table)
    ? table
    : "articles";

  return <AdminDataExplorer initialTable={initialTable} />;
}
