function createZip(files) {
  const localHeaderSignature = [0x50, 0x4b, 0x03, 0x04]; // Local file header signature
  const centralHeaderSignature = [0x50, 0x4b, 0x01, 0x02]; // Central directory signature
  const endOfCentralDirSignature = [0x50, 0x4b, 0x05, 0x06]; // End of central directory signature

  const chunks = []; // To hold ZIP file parts
  const centralDirectory = [];
  let offset = 0; // Byte offset for central directory

  function calculateCRC32(data) {
    let crc = 0xffffffff;
    for (let byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  files.forEach(({ name, content }) => {
    const nameBytes = new TextEncoder().encode(name);
    const contentBytes = content instanceof Uint8Array ? content : new Uint8Array(content);

    const crc32 = calculateCRC32(contentBytes);

    // Local file header
    const localHeader = new Uint8Array([
      ...localHeaderSignature, // Signature
      0x14, 0x00, // Version needed to extract
      0x00, 0x00, // General purpose bit flag
      0x00, 0x00, // Compression method (none)
      0x00, 0x00, // Last mod time
      0x00, 0x00, // Last mod date
      crc32 & 0xff, (crc32 >> 8) & 0xff, (crc32 >> 16) & 0xff, (crc32 >> 24) & 0xff, // CRC-32
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, (contentBytes.length >> 16) & 0xff, (contentBytes.length >> 24) & 0xff, // Compressed size
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, (contentBytes.length >> 16) & 0xff, (contentBytes.length >> 24) & 0xff, // Uncompressed size
      nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff, // File name length
      0x00, 0x00, // Extra field length
    ]);

    chunks.push(localHeader, nameBytes, contentBytes);

    // Central directory header
    const centralHeader = new Uint8Array([
      ...centralHeaderSignature, // Signature
      0x14, 0x00, // Version made by
      0x14, 0x00, // Version needed to extract
      0x00, 0x00, // General purpose bit flag
      0x00, 0x00, // Compression method (none)
      0x00, 0x00, // Last mod time
      0x00, 0x00, // Last mod date
      crc32 & 0xff, (crc32 >> 8) & 0xff, (crc32 >> 16) & 0xff, (crc32 >> 24) & 0xff, // CRC-32
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, (contentBytes.length >> 16) & 0xff, (contentBytes.length >> 24) & 0xff, // Compressed size
      contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, (contentBytes.length >> 16) & 0xff, (contentBytes.length >> 24) & 0xff, // Uncompressed size
      nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff, // File name length
      0x00, 0x00, // Extra field length
      0x00, 0x00, // File comment length
      0x00, 0x00, // Disk number start
      0x00, 0x00, // Internal file attributes
      0x00, 0x00, 0x00, 0x00, // External file attributes
      offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff, // Offset of local header
    ]);

    centralDirectory.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  // End of central directory
  const centralDirectorySize = centralDirectory.reduce((sum, part) => sum + part.length, 0);
  const endOfCentralDir = new Uint8Array([
    ...endOfCentralDirSignature, // Signature
    0x00, 0x00, // Number of this disk
    0x00, 0x00, // Disk where central directory starts
    files.length & 0xff, (files.length >> 8) & 0xff, // Number of central directory records on this disk
    files.length & 0xff, (files.length >> 8) & 0xff, // Total number of central directory records
    centralDirectorySize & 0xff, (centralDirectorySize >> 8) & 0xff, (centralDirectorySize >> 16) & 0xff, (centralDirectorySize >> 24) & 0xff, // Central directory size
    offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff, // Offset of start of central directory
    0x00, 0x00, // Comment length
  ]);

  // Combine all parts into a Blob
  return new Blob([...chunks, ...centralDirectory, endOfCentralDir], { type: 'application/zip' });
}

// Example usage with binary data (Excel file)
(async () => {
  const response = await fetch('path/to/your/excel.xlsx');
  const binaryContent = new Uint8Array(await response.arrayBuffer());

  const files = [
    { name: 'document.txt', content: 'This is a text file.' },
    { name: 'spreadsheet.xlsx', content: binaryContent },
  ];

  const zipBlob = createZip(files);

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'archive.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
})();