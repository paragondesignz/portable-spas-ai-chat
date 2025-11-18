import { randomUUID } from 'crypto';
import { list, put, del } from '@vercel/blob';

export type KnowledgebaseItemType = 'upload' | 'text';
export type KnowledgebaseItemStatus = 'draft' | 'submitted' | 'error';

export interface KnowledgebaseItem {
  id: string;
  type: KnowledgebaseItemType;
  title: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  fileUrl: string;
  contentType: string;
  size: number;
  status: KnowledgebaseItemStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  pineconeFileId?: string;
  pineconeFileName?: string;
  pineconeStatus?: string;
  lastSubmissionError?: string;
  notes?: string;
}

const BASE_PREFIX = 'knowledgebase/items';

const METADATA_FILENAME = 'metadata.json';

function getItemPrefix(id: string) {
  return `${BASE_PREFIX}/${id}`;
}

function getMetadataPath(id: string) {
  return `${getItemPrefix(id)}/${METADATA_FILENAME}`;
}

function getFilePath(id: string, fileName: string) {
  return `${getItemPrefix(id)}/${fileName}`;
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-');
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function saveMetadata(id: string, item: KnowledgebaseItem) {
  await put(getMetadataPath(id), JSON.stringify(item, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

function normalizeItem(item: KnowledgebaseItem): KnowledgebaseItem {
  return {
    ...item,
    size: Number(item.size),
  };
}

export async function listKnowledgebaseItems(options?: {
  type?: KnowledgebaseItemType;
  status?: KnowledgebaseItemStatus;
}): Promise<KnowledgebaseItem[]> {
  const { blobs } = await list({ prefix: BASE_PREFIX });
  const metadataBlobs = blobs.filter((blob) => blob.pathname.endsWith(`/${METADATA_FILENAME}`));

  const items: KnowledgebaseItem[] = [];
  for (const blob of metadataBlobs) {
    try {
      const response = await fetch(blob.url);
      if (!response.ok) {
        continue;
      }
      const data = (await response.json()) as KnowledgebaseItem;
      const normalized = normalizeItem(data);

      if (options?.type && normalized.type !== options.type) {
        continue;
      }
      if (options?.status && normalized.status !== options.status) {
        continue;
      }

      items.push(normalized);
    } catch (error) {
      console.error('Failed to load knowledgebase metadata:', error);
    }
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function createUploadDraft(params: {
  file: Blob;
  originalFileName: string;
  contentType?: string;
  notes?: string;
}): Promise<KnowledgebaseItem> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const originalFileName = params.originalFileName;
  const sanitizedFileName = sanitizeFileName(originalFileName);
  const storedFileName = sanitizedFileName || `file-${id}`;
  const filePath = getFilePath(id, storedFileName);

  const contentType =
    params.contentType && params.contentType.trim().length > 0
      ? params.contentType
      : 'application/octet-stream';

  const putResult = await put(filePath, params.file, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  const size = params.file.size ?? 0;

  const item: KnowledgebaseItem = {
    id,
    type: 'upload',
    title: titleFromFileName(originalFileName) || originalFileName,
    originalFileName,
    storedFileName,
    filePath,
    fileUrl: putResult.url,
    contentType,
    size,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    notes: params.notes,
  };

  await saveMetadata(id, item);

  return item;
}

export async function createTextDraft(params: {
  title: string;
  content: string;
}): Promise<KnowledgebaseItem> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const title = params.title.trim() || 'Untitled Entry';
  const slug = slugifyTitle(title) || `entry-${id}`;
  const storedFileName = `${slug}.md`;
  const filePath = getFilePath(id, storedFileName);
  const originalFileName = storedFileName;

  const blob = new Blob([params.content], { type: 'text/markdown' });

  const putResult = await put(filePath, blob, {
    access: 'public',
    contentType: 'text/markdown',
    addRandomSuffix: false,
  });

  const item: KnowledgebaseItem = {
    id,
    type: 'text',
    title,
    originalFileName,
    storedFileName,
    filePath,
    fileUrl: putResult.url,
    contentType: 'text/markdown',
    size: blob.size,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  await saveMetadata(id, item);

  return item;
}

export async function getKnowledgebaseItem(id: string): Promise<KnowledgebaseItem | null> {
  const { blobs } = await list({ prefix: getItemPrefix(id) });
  const metadataBlob = blobs.find((blob) => blob.pathname.endsWith(`/${METADATA_FILENAME}`));

  if (!metadataBlob) {
    return null;
  }

  try {
    const response = await fetch(metadataBlob.url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as KnowledgebaseItem;
    return normalizeItem(data);
  } catch (error) {
    console.error('Failed to get knowledgebase item metadata:', error);
    return null;
  }
}

export async function getKnowledgebaseItemContent(id: string): Promise<string | null> {
  const item = await getKnowledgebaseItem(id);
  if (!item) {
    return null;
  }

  try {
    const response = await fetch(item.fileUrl);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch knowledgebase item content for ${id}:`, error);
    return null;
  }
}

export async function updateTextItem(id: string, params: {
  title: string;
  content: string;
}): Promise<KnowledgebaseItem | null> {
  const item = await getKnowledgebaseItem(id);
  if (!item) {
    return null;
  }

  if (item.type !== 'text') {
    throw new Error('Cannot update text content for non-text item');
  }

  const now = new Date().toISOString();
  const title = params.title.trim() || item.title;

  const blob = new Blob([params.content], { type: 'text/markdown' });
  const putResult = await put(item.filePath, blob, {
    access: 'public',
    contentType: 'text/markdown',
    addRandomSuffix: false,
  });

  const updated: KnowledgebaseItem = {
    ...item,
    title,
    fileUrl: putResult.url,
    size: blob.size,
    updatedAt: now,
  };

  if (item.status === 'submitted') {
    updated.status = 'draft';
    delete updated.submittedAt;
    delete updated.pineconeFileId;
    delete updated.pineconeFileName;
    delete updated.pineconeStatus;
  }

  await saveMetadata(id, updated);

  return updated;
}

export async function removeKnowledgebaseItem(id: string): Promise<void> {
  const prefix = getItemPrefix(id);
  const { blobs } = await list({ prefix });

  for (const blob of blobs) {
    try {
      await del(blob.pathname);
    } catch (error) {
      console.error(`Failed to delete blob ${blob.pathname}:`, error);
    }
  }
}

export async function updateKnowledgebaseItemMetadata(
  id: string,
  updater: (current: KnowledgebaseItem) => KnowledgebaseItem
): Promise<KnowledgebaseItem | null> {
  const current = await getKnowledgebaseItem(id);
  if (!current) {
    return null;
  }

  const updated = updater(current);
  await saveMetadata(id, updated);
  return updated;
}

export function isSubmitted(item: KnowledgebaseItem) {
  return item.status === 'submitted' && !!item.pineconeFileId;
}

