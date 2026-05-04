import { query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();

    return await Promise.all(
      documents
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (document) => ({
          ...document,
          fileUrl: await ctx.storage.getUrl(document.fileStorageId),
        })),
    );
  },
});
