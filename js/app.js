// =========================================================
// SST VISION
// Controle da Tela 1 - Nova Inspeção
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

  // -------------------------------------------------------
  // ELEMENTOS
  // -------------------------------------------------------

  const cameraInput = document.getElementById("cameraInput");

  const btnAbrirCamera = document.getElementById("btnAbrirCamera");
  const btnRefazerFoto = document.getElementById("btnRefazerFoto");
  const btnUsarFoto = document.getElementById("btnUsarFoto");

  const cameraArea = document.getElementById("cameraArea");
  const previewContainer = document.getElementById("previewContainer");
  const fotoPreview = document.getElementById("fotoPreview");

  const grupoEquipamento = document.getElementById("grupoEquipamento");

  const mensagem = document.getElementById("mensagem");

  const tiposInspecao = document.querySelectorAll(
    'input[name="tipoInspecao"]'
  );


  // -------------------------------------------------------
  // ESTADO DA FOTO
  // -------------------------------------------------------

  let fotoSelecionada = null;
  let fotoURL = null;


  // -------------------------------------------------------
  // ABRIR CÂMERA
  // -------------------------------------------------------

  btnAbrirCamera.addEventListener("click", () => {

    cameraInput.click();

  });


  // -------------------------------------------------------
  // FOTO SELECIONADA / CAPTURADA
  // -------------------------------------------------------

  cameraInput.addEventListener("change", (event) => {

    const arquivo = event.target.files[0];

    if (!arquivo) {
      return;
    }

    if (!arquivo.type.startsWith("image/")) {

      exibirMensagem(
        "O arquivo selecionado não é uma imagem."
      );

      cameraInput.value = "";

      return;
    }


    fotoSelecionada = arquivo;


    // Remove URL anterior da memória
    if (fotoURL) {
      URL.revokeObjectURL(fotoURL);
    }


    fotoURL = URL.createObjectURL(arquivo);

    fotoPreview.src = fotoURL;


    // Esconde placeholder
    cameraArea.hidden = true;


    // Mostra fotografia
    previewContainer.hidden = false;


    // Ajusta botões
    btnAbrirCamera.hidden = true;
    btnRefazerFoto.hidden = false;
    btnUsarFoto.hidden = false;


    ocultarMensagem();

  });


  // -------------------------------------------------------
  // TIRAR NOVAMENTE
  // -------------------------------------------------------

  btnRefazerFoto.addEventListener("click", () => {

    limparFoto();

    cameraInput.click();

  });


  // -------------------------------------------------------
  // USAR FOTO
  // -------------------------------------------------------

  btnUsarFoto.addEventListener("click", async () => {

    const empresa = document
      .getElementById("empresa")
      .value
      .trim();

    const setor = document
      .getElementById("setor")
      .value
      .trim();


    if (!empresa) {

      exibirMensagem(
        "Informe a empresa ou fazenda antes de continuar."
      );

      document.getElementById("empresa").focus();

      return;
    }


    if (!setor) {

      exibirMensagem(
        "Informe o local ou setor da inspeção."
      );

      document.getElementById("setor").focus();

      return;
    }


    if (!fotoSelecionada) {

      exibirMensagem(
        "Registre uma fotografia antes de continuar."
      );

      return;
    }


    ocultarMensagem();


    // -----------------------------------------------------
    // FUTURA TELA 2
    // -----------------------------------------------------
    //
    // Aqui entraremos posteriormente com:
    //
    // - preparação da imagem
    // - envio para análise
    // - identificação do cenário
    // - possíveis riscos
    // - abertura da Tela 2
    //
    // Por enquanto apenas confirmamos que a Tela 1 funciona.
    // -----------------------------------------------------


try {
  exibirMensagem("Enviando imagem para análise...");

  const imagemComprimida = await comprimirImagem(fotoSelecionada);

  const imagemBase64 = await arquivoParaBase64(imagemComprimida);

  const resposta = await fetch(
    "https://sst-vision.onrender.com/analisar-imagem",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imagemBase64
      })
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || "Falha ao enviar a imagem."
    );
  }

if (dados.analise) {
  try {
const analise = JSON.parse(dados.analise);

console.log("Análise SST:", analise);

// Remove marcadores de uma análise anterior
previewContainer
  .querySelectorAll(".marcador-risco")
  .forEach((marcador) => marcador.remove());

// Cria um marcador para cada achado
console.log("ACHADOS RECEBIDOS:", analise.achados);
analise.achados.forEach((achado) => {

  if (!achado.posicao) {
    return;
  }

  const marcador = document.createElement("div");

  marcador.className = "marcador-risco";
  marcador.textContent = achado.id;

  marcador.style.left = `${achado.posicao.x}%`;
  marcador.style.top = `${achado.posicao.y}%`;

  marcador.title = achado.titulo;

  previewContainer.appendChild(marcador);
});

exibirMensagem(
  `Identificado: ${analise.identificacao.descricao}`
);
  } catch (erro) {
    console.error("Erro ao interpretar análise:", erro);

    exibirMensagem(
      "A análise foi recebida, mas não pôde ser interpretada."
    );
  }
} else {
  exibirMensagem(
    dados.mensagem || "Imagem enviada com sucesso."
  );
}

} catch (erro) {
  console.error("Erro ao enviar imagem:", erro);

  exibirMensagem(
    "Não foi possível enviar a imagem para o servidor."
  );
}

  });


  // -------------------------------------------------------
  // TIPO DE INSPEÇÃO
  // -------------------------------------------------------

  tiposInspecao.forEach((radio) => {

    radio.addEventListener("change", () => {

      const tipoSelecionado = document.querySelector(
        'input[name="tipoInspecao"]:checked'
      ).value;


      if (tipoSelecionado === "ambiente") {

        grupoEquipamento.hidden = true;

        document.getElementById("equipamento").value = "";

      } else {

        grupoEquipamento.hidden = false;

      }

    });

  });


  // -------------------------------------------------------
  // LIMPAR FOTO
  // -------------------------------------------------------

  function limparFoto() {

    fotoSelecionada = null;

    cameraInput.value = "";


    if (fotoURL) {

      URL.revokeObjectURL(fotoURL);

      fotoURL = null;

    }


    fotoPreview.removeAttribute("src");


    cameraArea.hidden = false;
    previewContainer.hidden = true;


    btnAbrirCamera.hidden = false;
    btnRefazerFoto.hidden = true;
    btnUsarFoto.hidden = true;


    ocultarMensagem();

  }

function comprimirImagem(arquivo, larguraMaxima = 1280, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const urlImagem = URL.createObjectURL(arquivo);

    imagem.onload = () => {
      let largura = imagem.width;
      let altura = imagem.height;

      if (largura > larguraMaxima) {
        const proporcao = larguraMaxima / largura;

        largura = larguraMaxima;
        altura = Math.round(altura * proporcao);
      }

      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");

      canvas.width = largura;
      canvas.height = altura;

      contexto.drawImage(
        imagem,
        0,
        0,
        largura,
        altura
      );

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(urlImagem);

          if (!blob) {
            reject(
              new Error("Não foi possível comprimir a imagem.")
            );

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        qualidade
      );
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(urlImagem);

      reject(
        new Error("Não foi possível carregar a imagem.")
      );
    };

    imagem.src = urlImagem;
  });
}
  
  function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      const resultado = leitor.result;

      if (typeof resultado !== "string") {
        reject(new Error("Falha ao converter a imagem."));
        return;
      }

      const base64 = resultado.split(",")[1];

      resolve(base64);
    };

    leitor.onerror = () => {
      reject(new Error("Erro ao ler a imagem."));
    };

    leitor.readAsDataURL(arquivo);
  });
}

  // -------------------------------------------------------
  // EXIBIR MENSAGEM
  // -------------------------------------------------------

  function exibirMensagem(texto) {

    mensagem.textContent = texto;

    mensagem.hidden = false;


    mensagem.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

  }


  // -------------------------------------------------------
  // OCULTAR MENSAGEM
  // -------------------------------------------------------

  function ocultarMensagem() {

    mensagem.textContent = "";

    mensagem.hidden = true;

  }


  // -------------------------------------------------------
  // SERVICE WORKER
  // -------------------------------------------------------

  if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

      navigator.serviceWorker
        .register("./service-worker.js")
        .catch((erro) => {

          console.error(
            "Erro ao registrar Service Worker:",
            erro
          );

        });

    });

  }

});
