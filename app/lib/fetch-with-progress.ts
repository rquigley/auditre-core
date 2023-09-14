export async function fetchWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (event: ProgressEvent<EventTarget>) => void,
): Promise<{ ok: boolean }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = onProgress;

    xhr.onload = function () {
      if (xhr.status === 200) {
        resolve({ ok: true });
      } else {
        console.error('Upload failed:', xhr.status, xhr.statusText);

        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = function () {
      reject(new Error('Error occurred while uploading'));
    };

    xhr.send(file);
  });
}
