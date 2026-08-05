"use strict";

/* ==================================================
   CONFIGURACIÓN
================================================== */

const CONFIG = {
  rutaInvitados: "data/invitados.json",
  parametroInvitado: "id",
  tiempoPantallaCarga: 600,
};

/* ==================================================
   ELEMENTOS DEL HTML
================================================== */

const loadingScreen = document.getElementById("loadingScreen");
const invitationContent = document.getElementById("invitationContent");
const accessError = document.getElementById("accessError");

const principalName = document.getElementById("principalName");
const guestCapacity = document.getElementById("guestCapacity");
const capacityLabel = document.getElementById("capacityLabel");

const musicButton = document.getElementById("musicButton");
const musicIcon = document.getElementById("musicIcon");
const bgMusic = document.getElementById("bgMusic");

/* ==================================================
   OBTENER IDENTIFICADOR DESDE LA URL
================================================== */

function obtenerIdentificador() {
  const parametros = new URLSearchParams(window.location.search);

  const identificador = parametros.get(CONFIG.parametroInvitado);

  if (!identificador) {
    return "";
  }

  return identificador.trim();
}

/* ==================================================
   DETECTAR SI ESTAMOS TRABAJANDO LOCALMENTE
================================================== */

function esEntornoLocal() {
  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
}

/* ==================================================
   MOSTRAR INVITACIÓN
================================================== */

function mostrarInvitacion() {
  if (accessError) {
    accessError.hidden = true;
  }

  if (invitationContent) {
    invitationContent.hidden = false;
  }

  ocultarPantallaCarga();
}

/* ==================================================
   MOSTRAR ERROR
================================================== */

function mostrarError() {
  if (invitationContent) {
    invitationContent.hidden = true;
  }

  if (accessError) {
    accessError.hidden = false;
  }

  ocultarPantallaCarga();

  if (musicButton) {
    musicButton.hidden = true;
  }
}

/* ==================================================
   OCULTAR PANTALLA DE CARGA
================================================== */

function ocultarPantallaCarga() {
  window.setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.hidden = true;
    }
  }, CONFIG.tiempoPantallaCarga);
}

/* ==================================================
   ACTUALIZAR DATOS DEL INVITADO
================================================== */

function actualizarInvitado(invitado) {
  if (!invitado) {
    mostrarError();
    return;
  }

  const nombre =
    invitado.principal ||
    invitado.nombre ||
    "Invitado";

  const cupos = Number(invitado.cupos) || 1;

  if (principalName) {
    principalName.textContent = nombre;
  }

  if (guestCapacity) {
    guestCapacity.textContent = cupos;
  }

  if (capacityLabel) {
    capacityLabel.textContent =
      cupos === 1 ? "cupo" : "cupos";
  }

  mostrarInvitacion();
}

/* ==================================================
   BUSCAR INVITADO
================================================== */

function buscarInvitado(invitados, identificador) {
  if (!Array.isArray(invitados)) {
    return null;
  }

  return invitados.find((invitado) => {
    const telefono = String(
      invitado.telefono || invitado.id || ""
    ).trim();

    return telefono === identificador;
  });
}

/* ==================================================
   CARGAR ARCHIVO DE INVITADOS
================================================== */

async function cargarInvitados() {
  const identificador = obtenerIdentificador();

  /*
   * Durante la prueba local, si no se escribe un identificador,
   * se muestra la invitación con los datos temporales del HTML.
   */
  if (!identificador && esEntornoLocal()) {
    mostrarInvitacion();
    return;
  }

  /*
   * En la página publicada, un enlace sin identificador
   * se considera inválido.
   */
  if (!identificador) {
    mostrarError();
    return;
  }

  try {
    const respuesta = await fetch(
      CONFIG.rutaInvitados,
      {
        cache: "no-store",
      }
    );

    if (!respuesta.ok) {
      throw new Error(
        `No fue posible cargar invitados.json: ${respuesta.status}`
      );
    }

    const invitados = await respuesta.json();

    const invitado = buscarInvitado(
      invitados,
      identificador
    );

    if (!invitado) {
      mostrarError();
      return;
    }

    actualizarInvitado(invitado);
  } catch (error) {
    console.error(
      "Error al cargar la lista de invitados:",
      error
    );

    /*
     * En el entorno local permite continuar viendo el diseño,
     * aunque invitados.json todavía esté vacío o incompleto.
     */
    if (esEntornoLocal()) {
      mostrarInvitacion();
      return;
    }

    mostrarError();
  }
}

/* ==================================================
   CONTROL DE MÚSICA
================================================== */

function actualizarBotonMusica(reproduciendo) {
  if (!musicButton || !musicIcon) {
    return;
  }

  if (reproduciendo) {
    musicButton.classList.add("is-playing");

    musicButton.setAttribute(
      "aria-label",
      "Pausar música"
    );

    musicButton.setAttribute(
      "aria-pressed",
      "true"
    );

    musicIcon.textContent = "pause";
  } else {
    musicButton.classList.remove("is-playing");

    musicButton.setAttribute(
      "aria-label",
      "Reproducir música"
    );

    musicButton.setAttribute(
      "aria-pressed",
      "false"
    );

    musicIcon.textContent = "music_note";
  }
}

async function alternarMusica() {
  if (!bgMusic) {
    return;
  }

  try {
    if (bgMusic.paused) {
      await bgMusic.play();
      actualizarBotonMusica(true);
    } else {
      bgMusic.pause();
      actualizarBotonMusica(false);
    }
  } catch (error) {
    console.error(
      "No fue posible reproducir la música:",
      error
    );

    actualizarBotonMusica(false);
  }
}

function configurarMusica() {
  if (!musicButton || !bgMusic) {
    return;
  }

  /*
   * Volumen inicial moderado para no sorprender
   * a la persona que abre la invitación.
   */
  bgMusic.volume = 0.55;

  musicButton.addEventListener(
    "click",
    alternarMusica
  );

  bgMusic.addEventListener("pause", () => {
    actualizarBotonMusica(false);
  });

  bgMusic.addEventListener("play", () => {
    actualizarBotonMusica(true);
  });

  bgMusic.addEventListener("error", () => {
    console.error(
      "No se encontró o no se pudo cargar assets/audio/agua.mp3"
    );

    musicButton.hidden = true;
  });
}

/* ==================================================
   INICIAR INVITACIÓN
================================================== */

window.addEventListener(
  "DOMContentLoaded",
  () => {
    configurarMusica();
    cargarInvitados();
  }
);