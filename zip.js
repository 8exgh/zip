function createZip(files) {
  const localHeaderSignature = [0x50, 0x4b, 0x03, 0x04]; // Local file header signature
  const centralHeaderSignature = [0x50, 0x4b, 0x01, 0x02]; // Central directory signature
  const endOfCentralDirSignature = [0x50, 0x4b, 0x05, 0x06]; // End of central directory signature

  const chunks = []; // For holding the ZIP file parts
  const centralDirectory = [];
  let offset = 0; // Track the byte offset for central directory

  files.forEach(({ name, content }, index) => {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);

    // Local file header
    const localHeader = new Uint8Array([
      ...localHeaderSignature, // Local file header signature
      0x14, 0x00, // Version needed to extract
      0x00, 0x00, // General purpose bit flag
      0x00, 0x00, // Compression method (no compression)
      0x00, 0x00, // File last modification time
      0x00, 0x00, // File last modification date
      0x00, 0x00, 0x00, 0x00, // CRC-32 (not implemented here)
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, 0x00, 0x00, // Compressed size
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, 0x00, 0x00, // Uncompressed size
      nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff, // File name length
      0x00, 0x00, // Extra field length
    ]);

    // Append the local file header, filename, and content
    chunks.push(localHeader, nameBytes, contentBytes);

    // Central directory header
    const centralHeader = new Uint8Array([
      ...centralHeaderSignature, // Central directory file header signature
      0x14, 0x00, // Version made by
      0x14, 0x00, // Version needed to extract
      0x00, 0x00, // General purpose bit flag
      0x00, 0x00, // Compression method (no compression)
      0x00, 0x00, // File last modification time
      0x00, 0x00, // File last modification date
      0x00, 0x00, 0x00, 0x00, // CRC-32 (not implemented here)
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, 0x00, 0x00, // Compressed size
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, 0x00, 0x00, // Uncompressed size
      nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff, // File name length
      0x00, 0x00, // Extra field length
      0x00, 0x00, // File comment length
      0x00, 0x00, // Disk number start
      0x00, 0x00, // Internal file attributes
      0x00, 0x00, 0x00, 0x00, // External file attributes
      offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff, // Relative offset of local header
    ]);

    // Append the central directory header and filename
    centralDirectory.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  // End of central directory
  const endOfCentralDir = new Uint8Array([
    ...endOfCentralDirSignature, // End of central directory signature
    0x00, 0x00, // Number of this disk
    0x00, 0x00, // Disk where central directory starts
    files.length & 0xff, (files.length >> 8) & 0xff, // Number of central directory records on this disk
    files.length & 0xff, (files.length >> 8) & 0xff, // Total number of central directory records
    centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0) & 0xff, 0x00, 0x00, 0x00, // Size of central directory
    offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff, // Offset of start of central directory
    0x00, 0x00, // Comment length
  ]);

  // Combine all parts into a single blob
  return new Blob([...chunks, ...centralDirectory, endOfCentralDir], { type: 'application/zip' });
}

// Example Usage
(async () => {
  const files = [
    { name: 'file1.txt', content: 'Hello, world!' },
    { name: 'file2.csv', content: 'Name,Age\nAlice,30\nBob,25' },
  ];

  const zipBlob = createZip(files);

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'files.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
})();