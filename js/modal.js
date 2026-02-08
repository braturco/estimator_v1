// Simple global modal helper

window.Modal = (function () {
  let current = null;

  function open({ title, content, onSave, onClose }) {
    close(); // ensure only one

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("div");
    header.className = "modal-header";

    const titleEl = document.createElement("div");
    titleEl.className = "modal-title";
    titleEl.textContent = title;

    const closeEl = document.createElement("div");
    closeEl.className = "modal-close";
    closeEl.textContent = "×";
    closeEl.addEventListener("click", () => {
      if (onClose) onClose();
      close();
    });

    header.appendChild(titleEl);
    header.appendChild(closeEl);

    const body = document.createElement("div");
    body.className = "modal-body";
    if (typeof content === "function") {
      content(body);
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    // Only show footer if there's a save action
    if (onSave) {
      const footer = document.createElement("div");
      footer.className = "modal-footer";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        if (onClose) onClose();
        close();
      });

      const saveBtn = document.createElement("button");
      saveBtn.className = "btn btn-primary";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", () => {
        onSave(body);
      });

      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
    } else {
      modal.appendChild(header);
      modal.appendChild(body);
    }

    backdrop.appendChild(modal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        if (onClose) onClose();
        close();
      }
    });

    document.body.appendChild(backdrop);
    current = backdrop;
  }

  function close() {
    if (current) {
      current.remove();
      current = null;
    }
  }

  function choice({ title, message, choices, onChoice }) {
    close();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.minWidth = "400px";

    const header = document.createElement("div");
    header.className = "modal-header";
    const titleEl = document.createElement("div");
    titleEl.className = "modal-title";
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const body = document.createElement("div");
    body.className = "modal-body";
    body.style.padding = "20px 14px";
    body.textContent = message;

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    footer.style.gap = "12px";

    choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.className = choice.primary ? "btn btn-primary" : "btn";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        if (onChoice) onChoice(choice.value);
        close();
      });
      footer.appendChild(btn);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    current = backdrop;
  }

  return { open, close, choice };
})();
