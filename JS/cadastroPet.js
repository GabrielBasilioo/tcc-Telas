const form = document.getElementById("petForm");

const mediaInput = document.getElementById("petMedia");
const uploadArea = document.querySelector(".upload-area");
const preview = document.getElementById("preview");


// ==================================================
// ESPÉCIE
// Permite selecionar apenas uma opção
// ==================================================

const especieInputs = document.querySelectorAll(
    'input[name="especie"]'
);

especieInputs.forEach((input) => {

    input.addEventListener("change", () => {

        if (!input.checked) {
            return;
        }

        especieInputs.forEach((other) => {

            if (other !== input) {
                other.checked = false;
            }

        });

    });

});


// ==================================================
// UPLOAD DE IMAGEM
// ==================================================

function mostrarPreview(file) {

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        alert("Selecione uma imagem válida.");

        mediaInput.value = "";

        preview.src = "";

        preview.style.display = "none";

        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        preview.src = event.target.result;

        preview.style.display = "block";

    };

    reader.readAsDataURL(file);
}


mediaInput.addEventListener("change", function () {

    const file = this.files[0];

    mostrarPreview(file);

});


// ==================================================
// DRAG AND DROP
// ==================================================

uploadArea.addEventListener("dragover", function (event) {

    event.preventDefault();

    uploadArea.style.background =
        "rgba(255, 121, 24, .08)";

});


uploadArea.addEventListener("dragleave", function () {

    uploadArea.style.background = "";

});


uploadArea.addEventListener("drop", function (event) {

    event.preventDefault();

    uploadArea.style.background = "";

    const file = event.dataTransfer.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        alert("Por favor, envie uma imagem válida.");

        return;
    }

    try {

        mediaInput.files = event.dataTransfer.files;

    } catch (error) {

        console.warn(
            "Não foi possível atribuir o arquivo diretamente ao input.",
            error
        );

    }

    mostrarPreview(file);

});


// ==================================================
// CADASTRO
// ==================================================

form.addEventListener("submit", function (event) {

    event.preventDefault();


    // ----------------------------------------------
    // CAMPOS
    // ----------------------------------------------

    const nome =
        document.getElementById("nome").value.trim();

    const especie =
        document.querySelector(
            'input[name="especie"]:checked'
        );

    const raca =
        document.getElementById("raca").value.trim();

    const idade =
        document.getElementById("idade").value;

    const descricao =
        document.getElementById("descricao").value.trim();

    const microchipado =
        document.querySelector(
            'input[name="microchipado"]:checked'
        );

    const castrado =
        document.querySelector(
            'input[name="castrado"]:checked'
        );


    // ----------------------------------------------
    // VALIDAÇÕES
    // ----------------------------------------------

    if (!nome) {

        alert("Digite o nome do animal.");

        document.getElementById("nome").focus();

        return;
    }


    if (!especie) {

        alert("Selecione a espécie do animal.");

        return;
    }


    if (!raca) {

        alert("Digite a raça do animal.");

        document.getElementById("raca").focus();

        return;
    }


    if (idade === "") {

        alert("Informe a idade do animal.");

        document.getElementById("idade").focus();

        return;
    }


    if (!microchipado) {

        alert(
            "Informe se o animal é microchipado."
        );

        return;
    }


    if (!castrado) {

        alert(
            "Informe se o animal é castrado."
        );

        return;
    }


    // ----------------------------------------------
    // DADOS DO PET
    // ----------------------------------------------

    const pet = {

        id: Date.now(),

        nome: nome,

        especie: especie.value,

        raca: raca,

        idade: Number(idade),

        descricao: descricao,

        microchipado: microchipado.value,

        castrado: castrado.value,

        imagem:
            mediaInput.files.length
                ? mediaInput.files[0].name
                : null,

        criadoEm:
            new Date().toISOString()

    };


    // ----------------------------------------------
    // SALVAR NO LOCALSTORAGE
    // ----------------------------------------------

    const petsSalvos =
        JSON.parse(
            localStorage.getItem("pets")
        ) || [];

    petsSalvos.push(pet);

    localStorage.setItem(
        "pets",
        JSON.stringify(petsSalvos)
    );


    // ----------------------------------------------
    // LOG
    // ----------------------------------------------

    console.log(
        "PET CADASTRADO:",
        pet
    );


    // ----------------------------------------------
    // SUCESSO
    // ----------------------------------------------

    alert(
        `Pet "${nome}" cadastrado com sucesso!`
    );


    // ----------------------------------------------
    // LIMPA FORMULÁRIO
    // ----------------------------------------------

    form.reset();

    preview.src = "";

    preview.style.display = "none";


    // Mantém o usuário na tela de cadastro.
    // Se quiser direcionar para outra tela,
    // pode usar:
    //
    // window.location.href = "perfil.html";

});
