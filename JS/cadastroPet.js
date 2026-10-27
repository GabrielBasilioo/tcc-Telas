// ==================================================
// SUPABASE
// ==================================================

const SUPABASE_URL =
    "https://blpueqrzgqypkabjnvlu.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==================================================
// ELEMENTOS
// ==================================================

const form =
    document.getElementById("petForm");

const mediaInput =
    document.getElementById("petMedia");

const uploadArea =
    document.querySelector(".upload-area");

const previewVideo =
    document.getElementById("preview");

const previewImg =
    document.getElementById("previewImg");


// ==================================================
// ESPÉCIE
// ==================================================

 // ==================================================
 // ESPÉCIE E LISTA DE RAÇAS
 // ==================================================

const especieInputs = document.querySelectorAll(
    'input[name="especie"]'
);

const racaInput = document.getElementById("raca");
const listaRacas = document.getElementById("listaRacas");

// Raças de gatos
const racasGatos = [
    "SRD (Sem Raça Definida)",
    "Abissínio",
    "Angorá",
    "Azul Russo",
    "Bengal",
    "Birmanês",
    "Bombaim",
    "British Shorthair",
    "Burmês",
    "Chartreux",
    "Cornish Rex",
    "Devon Rex",
    "Exótico de Pelo Curto",
    "Himalaio",
    "Maine Coon",
    "Manx",
    "Mau Egípcio",
    "Norueguês da Floresta",
    "Oriental de Pelo Curto",
    "Persa",
    "Ragdoll",
    "Savannah",
    "Scottish Fold",
    "Selkirk Rex",
    "Siamês",
    "Siberiano",
    "Singapura",
    "Somali",
    "Sphynx",
    "Tonquinês",
    "Turco da Van"
];

// Raças de cachorros
const racasCachorros = [
    "SRD (Sem Raça Definida)",
    "Akita Inu",
    "American Bully",
    "Basset Hound",
    "Beagle",
    "Bichon Frisé",
    "Border Collie",
    "Boston Terrier",
    "Boxer",
    "Bull Terrier",
    "Bulldog Francês",
    "Bulldog Inglês",
    "Cane Corso",
    "Cavalier King Charles Spaniel",
    "Chihuahua",
    "Chow Chow",
    "Cocker Spaniel",
    "Dachshund (Salsicha)",
    "Dálmata",
    "Dobermann",
    "Dogo Argentino",
    "Fila Brasileiro",
    "Golden Retriever",
    "Husky Siberiano",
    "Jack Russell Terrier",
    "Labrador Retriever",
    "Lhasa Apso",
    "Lulu da Pomerânia (Spitz Alemão)",
    "Maltês",
    "Mastim Inglês",
    "Pastor Alemão",
    "Pastor Australiano",
    "Pastor Belga",
    "Pequinês",
    "Pinscher",
    "Pit Bull",
    "Pointer Inglês",
    "Poodle",
    "Pug",
    "Rottweiler",
    "Samoieda",
    "São Bernardo",
    "Schnauzer",
    "Shar-Pei",
    "Shiba Inu",
    "Shih Tzu",
    "Staffordshire Bull Terrier",
    "Weimaraner",
    "West Highland White Terrier",
    "Whippet",
    "Yorkshire Terrier"
];

function atualizarRacas(especie) {
    const racas = especie === "gato"
        ? racasGatos
        : especie === "cachorro"
            ? racasCachorros
            : [];

    // Limpa as sugestões anteriores
    listaRacas.replaceChildren();

    // Limpa a raça anterior ao trocar de espécie
    racaInput.value = "";

    if (racas.length === 0) {
        racaInput.disabled = true;
        racaInput.placeholder = "Escolha primeiro a espécie";
        return;
    }

    // Cria as opções da espécie escolhida
    racas.forEach((raca) => {
        const opcao = document.createElement("option");
        opcao.value = raca;
        listaRacas.appendChild(opcao);
    });

    racaInput.disabled = false;
    racaInput.placeholder = especie === "gato"
        ? "Digite ou escolha uma raça de gato"
        : "Digite ou escolha uma raça de cachorro";
}

// Detecta a seleção de gato ou cachorro
especieInputs.forEach((input) => {
    input.addEventListener("change", () => {
        if (!input.checked) return;

        // Mantém apenas uma espécie selecionada
        especieInputs.forEach((other) => {
            if (other !== input) {
                other.checked = false;
            }
        });

        atualizarRacas(input.value);
    });
});


// ==================================================
// PREVIEW (IMAGEM OU VÍDEO)
// ==================================================

function limparPreview() {
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.load();
    previewVideo.style.display = "none";

    previewImg.removeAttribute("src");
    previewImg.style.display = "none";
}

function mostrarPreview(file) {
    if (!file) return;

    const ehImagem = file.type.startsWith("image/");
    const ehVideo = file.type.startsWith("video/");

    if (!ehImagem && !ehVideo) {
        alert("Selecione uma imagem ou vídeo válido.");
        mediaInput.value = "";
        return;
    }

    limparPreview();

    const url = URL.createObjectURL(file);

    if (ehVideo) {
        previewVideo.src = url;
        previewVideo.style.display = "block";
        previewVideo.controls = true;
        previewVideo.muted = true;
        previewVideo.playsInline = true;
    } else {
        previewImg.src = url;
        previewImg.style.display = "block";
    }
}


// ==================================================
// SELEÇÃO DA MÍDIA
// ==================================================

mediaInput.addEventListener("change", function () {
    const file = this.files[0];
    mostrarPreview(file);
});


// ==================================================
// DRAG AND DROP
// ==================================================

uploadArea.addEventListener("dragover", function (event) {
    event.preventDefault();
    uploadArea.style.background = "rgba(255, 121, 24, .08)";
});

uploadArea.addEventListener("dragleave", function () {
    uploadArea.style.background = "";
});

uploadArea.addEventListener("drop", function (event) {
    event.preventDefault();
    uploadArea.style.background = "";

    const file = event.dataTransfer.files[0];

    if (!file) return;

    if (
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/")
    ) {
        alert("Por favor, envie somente uma imagem ou vídeo.");
        return;
    }

    try {
        mediaInput.files = event.dataTransfer.files;
    } catch (error) {
        console.warn(
            "Não foi possível atribuir o arquivo.",
            error
        );
    }

    mostrarPreview(file);
});


// ==================================================
// CADASTRO
// ==================================================

form.addEventListener("submit", async function (event) {
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

    const genero =
        document.querySelector(
            'input[name="genero"]:checked'
        );

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

    // NOVO CAMPO: VACINADO
    const vacinado =
        document.querySelector(
            'input[name="vacinado"]:checked'
        );

    const midia = mediaInput.files[0];


    // ----------------------------------------------
    // VALIDAÇÕES
    // ----------------------------------------------

    if (!nome) {
        alert("Digite o nome do animal.");
        return;
    }

    if (!especie) {
        alert("Selecione a espécie do animal.");
        return;
    }

    if (!raca) {
        alert("Digite a raça do animal.");
        return;
    }

    if (!genero) {
        alert("Selecione o gênero do animal.");
        return;
    }

    if (idade === "") {
        alert("Informe a idade do animal.");
        return;
    }

    if (!microchipado) {
        alert("Informe se o animal é microchipado.");
        return;
    }

    if (!castrado) {
        alert("Informe se o animal é castrado.");
        return;
    }

    // VALIDAÇÃO DO CAMPO VACINADO
    if (!vacinado) {
        alert("Informe se o animal é vacinado.");
        return;
    }

    if (!midia) {
        alert("Selecione uma imagem ou vídeo do animal.");
        return;
    }

    if (
        !midia.type.startsWith("image/") &&
        !midia.type.startsWith("video/")
    ) {
        alert("O arquivo selecionado não é uma imagem ou vídeo válido.");
        return;
    }


    // ----------------------------------------------
    // USUÁRIO LOGADO
    // ----------------------------------------------

    const {
        data: sessionData,
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
        console.error(
            "Erro ao verificar sessão:",
            sessionError
        );

        alert("Não foi possível verificar seu login.");
        return;
    }

    const session = sessionData.session;

    if (!session) {
        alert("Você precisa estar logado para cadastrar um pet.");
        return;
    }

    const user = session.user;


    // ----------------------------------------------
    // CONVERTE SIM/NÃO PARA BOOLEAN
    // ----------------------------------------------

    const microchipadoBoolean =
        microchipado.value === "sim";

    const castradoBoolean =
        castrado.value === "sim";

    // NOVO CAMPO: CONVERSÃO DE VACINADO
    const vacinadoBoolean =
        vacinado.value === "sim";


    // ----------------------------------------------
    // ENVIA MÍDIA PARA O STORAGE
    // ----------------------------------------------

    const midiaTipo =
        midia.type.startsWith("video/")
            ? "video"
            : "imagem";

    const extensao =
        midia.name
            .split(".")
            .pop()
            .toLowerCase();

    const nomeArquivo =
        `${user.id}/${crypto.randomUUID()}.${extensao}`;

    console.log("Enviando mídia:", nomeArquivo);

    const {
        error: uploadError
    } = await supabaseClient
        .storage
        .from("videos")
        .upload(
            nomeArquivo,
            midia,
            {
                contentType: midia.type,
                cacheControl: "3600",
                upsert: false
            }
        );

    if (uploadError) {
        console.error(
            "Erro ao enviar mídia:",
            uploadError
        );

        alert("Erro ao enviar a mídia para o Storage.");
        return;
    }


    // ----------------------------------------------
    // PEGA URL DA MÍDIA
    // ----------------------------------------------

    const {
        data: publicUrlData
    } = supabaseClient
        .storage
        .from("videos")
        .getPublicUrl(nomeArquivo);

    const mediaUrl = publicUrlData.publicUrl;

    console.log("URL da mídia:", mediaUrl);


    // ----------------------------------------------
    // SALVA DADOS NA TABELA PETS
    // ----------------------------------------------

    const petData = {
        user_id: user.id,

        nome: nome,

        especie: especie.value,

        raca: raca,

        genero: genero.value,

        idade: Number(idade),

        descricao: descricao || null,

        microchipado: microchipadoBoolean,

        castrado: castradoBoolean,

        // NOVO CAMPO SALVO NO SUPABASE
        vacinado: vacinadoBoolean,

        media_url: mediaUrl,

        media_type: midiaTipo
    };

    console.log(
        "Dados que serão enviados:",
        petData
    );

    const {
        data: pet,
        error: insertError
    } = await supabaseClient
        .from("pets")
        .insert(petData)
        .select()
        .single();


    // ----------------------------------------------
    // ERRO AO SALVAR PET
    // ----------------------------------------------

    if (insertError) {
        console.error(
            "Erro ao cadastrar pet:",
            insertError
        );

        // Remove a mídia do Storage
        // para não deixar arquivo órfão.
        await supabaseClient
            .storage
            .from("videos")
            .remove([nomeArquivo]);

        alert(
            "A mídia foi enviada, mas os dados não puderam ser salvos no banco."
        );

        return;
    }


    // ----------------------------------------------
    // SUCESSO
    // ----------------------------------------------

    console.log("Pet cadastrado:", pet);

    alert(`Pet "${nome}" cadastrado com sucesso!`);


    // ----------------------------------------------
    // LIMPA FORMULÁRIO
    // ----------------------------------------------

    form.reset();

    limparPreview();
});