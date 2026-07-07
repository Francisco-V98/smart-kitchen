// Shared helper for optional image attachments (incidencia + comments).
// Stores images as data URLs directly in localStorage, so a soft size cap
// keeps any one photo from bloating storage.
(function () {
  'use strict';

  var MAX_BYTES = 3 * 1024 * 1024; // 3MB

  function readAsDataURL(file, cb) {
    if (!file) return;
    if (file.size > MAX_BYTES) { alert('La imagen es muy grande (máximo 3MB).'); return; }
    var reader = new FileReader();
    reader.onload = function (e) { cb(e.target.result); };
    reader.readAsDataURL(file);
  }

  window.ImageUpload = { readAsDataURL: readAsDataURL, MAX_BYTES: MAX_BYTES };
})();
