import PocketBase from "pocketbase";

const pb = new PocketBase(window.location.origin);
pb.autoCancellation(false);

export default pb;

export function getFileUrl(record, fieldName) {
  const filename = record[fieldName];
  if (!filename) return "";
  return pb.files.getURL(record, filename);
}
