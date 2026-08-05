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

const invitationContent = document.getElementById(
  "invitationContent"
);

const accessError = document.getElementById("accessError");

const principalName = document.getElementById("principalName");
const guestCapacity = document.getElementById("guestCapacity");
const capacityLabel = document.getElementById("capacityLabel");

const musicButton = document.getElementById("musicButton");
const musicIcon = document.getElementById("musicIcon");
const bgMusic = document.getElementById("bgMusic");

const locationButton = document.getElementById("locationButton");
const organizerButton = document.getElementById("organizerButton");

/*
 * Guarda temporalmente al invitado cargado.
 * Se utiliza para asociar los clics con el ID correcto.
 */
let invitadoActual = null;

/* ==================================================
   GOOGLE TAG MANAGER / DATA LAYER
================================================== */

window.dataLayer = window.dataLayer || [];

/**
 * Envía un evento a Google Tag Manager.
 *
 * No se envía el nombre del invitado para evitar transmitir
 * información personal a Google Analytics.
 */
function enviarEventoAnalitica(nombreEvento, parametros = {}) {
  window.dataLayer.push({
    event: nombreEvento,
    ...parametros,
  });
}

/**
 * Devuelve los parámetros anónimos del invitado actual.
 */
function obtenerParametrosInvitado() {
  if (!invitadoActual) {
    return {};
  }

  return {
    guest_id: invitadoActual.id,
    guest_type: invitadoActual.tipo,
    guest_slots: Number(invitadoActual.cupos) || 1,
  };
}

/* ==================================================
   OBTENER IDENTIFICADOR DESDE LA URL
================================================== */

function obtenerIdentificador() {
  const parametros = new URLSearchParams(
    window.location.search
  );

  const identificador = parametros.get(
    CONFIG.parametroInvitado
  );

  if (!identificador) {
    return "";
  }

  return identificador.trim();
}

/* ==================================================
   DETECTAR ENTORNO LOCAL
================================================== */

function esEntornoLocal() {
  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
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
   MOSTRAR INVITACIÓN
================================================== */

function mostrarInvitacion() {
  if (accessError) {
    accessError.hidden = true;
  }

  if (invitationContent) {
    invitationContent.hidden = false;
  }

  if (musicButton) {
    musicButton.hidden = false;
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

  if (musicButton) {
    musicButton.hidden = true;
  }

  enviarEventoAnalitica("invitation_not_found", {
    requested_guest_id: obtenerIdentificador(),
  });

  ocultarPantallaCarga();
}

/* ==================================================
   CONFIGURAR TIPO DE INVITACIÓN
================================================== */

function configurarTipoInvitacion(tipo) {
  if (!invitationContent) {
    return;
  }

  const tipoNormalizado = String(
    tipo || "alojamiento"
  )
    .trim()
    .toLowerCase();

  const esPasadia =
    tipoNormalizado === "pasadia" ||
    tipoNormalizado === "pasa dia" ||
    tipoNormalizado === "pasa-día" ||
    tipoNormalizado === "pasadía";

  invitationContent.classList.toggle(
    "is-pasadia",
    esPasadia
  );
}

/* ==================================================
   ACTUALIZAR DATOS DEL INVITADO
================================================== */

function actualizarInvitado(invitado) {
  if (!invitado) {
    mostrarError();
    return;
  }

  invitadoActual = invitado;

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

  configurarTipoInvitacion(invitado.tipo);

  mostrarInvitacion();

  /*
   * Se registra únicamente cuando la invitación válida
   * ya fue cargada correctamente.
   */
  enviarEventoAnalitica(
    "view_invitation",
    obtenerParametrosInvitado()
  );
}

/* ==================================================
   BUSCAR INVITADO
================================================== */

function buscarInvitado(invitados, identificador) {
  if (!Array.isArray(invitados)) {
    return null;
  }

  return invitados.find((invitado) => {
    const id = String(
      invitado.id ||
      invitado.telefono ||
      ""
    ).trim();

    return id === identificador;
  });
}

/* ==================================================
   CARGAR ARCHIVO DE INVITADOS
================================================== */

async function cargarInvitados() {
  const identificador = obtenerIdentificador();

  /*
   * En local y sin ID, permite revisar el diseño.
   */
  if (!identificador && esEntornoLocal()) {
    configurarTipoInvitacion("alojamiento");
    mostrarInvitacion();
    return;
  }

  /*
   * En la versión publicada se requiere un ID válido.
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

    if (esEntornoLocal()) {
      configurarTipoInvitacion("alojamiento");
      mostrarInvitacion();
      return;
    }

    mostrarError();
  }
}

/* ==================================================
   EVENTOS DE WAZE Y WHATSAPP
================================================== */

function configurarEventosBotones() {
  if (locationButton) {
    locationButton.addEventListener("click", () => {
      enviarEventoAnalitica(
        "click_waze",
        obtenerParametrosInvitado()
      );
    });
  }

  if (organizerButton) {
    organizerButton.addEventListener("click", () => {
      enviarEventoAnalitica(
        "click_whatsapp",
        obtenerParametrosInvitado()
      );
    });
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

      /*
       * Solo se registra cuando la canción comienza
       * realmente a reproducirse.
       */
      enviarEventoAnalitica(
        "music_play",
        obtenerParametrosInvitado()
      );
    } else {
      bgMusic.pause();

      actualizarBotonMusica(false);

      enviarEventoAnalitica(
        "music_pause",
        obtenerParametrosInvitado()
      );
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
   SCROLL HASTA EL FINAL
================================================== */

function configurarScrollFinal() {
  let finalRegistrado = false;

  window.addEventListener(
    "scroll",
    () => {
      if (finalRegistrado || !invitadoActual) {
        return;
      }

      const posicionActual =
        window.scrollY + window.innerHeight;

      const alturaDocumento =
        document.documentElement.scrollHeight;

      const llegoAlFinal =
        posicionActual >= alturaDocumento - 80;

      if (llegoAlFinal) {
        finalRegistrado = true;

        enviarEventoAnalitica(
          "invitation_complete",
          obtenerParametrosInvitado()
        );
      }
    },
    {
      passive: true,
    }
  );
}

/* ==================================================
   INICIAR INVITACIÓN
================================================== */

window.addEventListener(
  "DOMContentLoaded",
  () => {
    configurarMusica();
    configurarEventosBotones();
    configurarScrollFinal();
    cargarInvitados();
  }
);