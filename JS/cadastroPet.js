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

const especieInputs =
    document.querySelectorAll(
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

    if (!file) {
        return;
    }

    const ehImagem = file.type.startsWith("image/");
    const ehVideo = file.type.startsWith("video/");

    if (!ehImagem && !ehVideo) {

        alert(
            "Selecione uma imagem ou vídeo válido."
        );

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

mediaInput.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];

        mostrarPreview(file);

    }
);


// ==================================================
// DRAG AND DROP
// ==================================================

uploadArea.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        uploadArea.style.background =
            "rgba(255, 121, 24, .08)";

    }
);


uploadArea.addEventListener(
    "dragleave",
    function () {

        uploadArea.style.background = "";

    }
);


uploadArea.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        uploadArea.style.background = "";

        const file =
            event.dataTransfer.files[0];


        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {

            alert(
                "Por favor, envie somente uma imagem ou vídeo."
            );

            return;
        }


        try {

            mediaInput.files =
                event.dataTransfer.files;

        } catch (error) {

            console.warn(
                "Não foi possível atribuir o arquivo.",
                error
            );

        }


        mostrarPreview(file);

    }
);


// ==================================================
// CADASTRO
// ==================================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // ------------------------------------------
        // CAMPOS
        // ------------------------------------------

        const nome =
            document
                .getElementById("nome")
                .value
                .trim();


        const especie =
            document.querySelector(
                'input[name="especie"]:checked'
            );


        const raca =
            document
                .getElementById("raca")
                .value
                .trim();


        const idade =
            document
                .getElementById("idade")
                .value;


        const descricao =
            document
                .getElementById("descricao")
                .value
                .trim();


        const microchipado =
            document.querySelector(
                'input[name="microchipado"]:checked'
            );


        const castrado =
            document.querySelector(
                'input[name="castrado"]:checked'
            );


        const midia =
            mediaInput.files[0];


        // ------------------------------------------
        // VALIDAÇÕES
        // ------------------------------------------

        if (!nome) {

            alert(
                "Digite o nome do animal."
            );

            return;
        }


        if (!especie) {

            alert(
                "Selecione a espécie do animal."
            );

            return;
        }


        if (!raca) {

            alert(
                "Digite a raça do animal."
            );

            return;
        }


        if (idade === "") {

            alert(
                "Informe a idade do animal."
            );

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


        if (!midia) {

            alert(
                "Selecione uma imagem ou vídeo do animal."
            );

            return;
        }


        if (!midia.type.startsWith("image/") && !midia.type.startsWith("video/")) {

            alert(
                "O arquivo selecionado não é uma imagem ou vídeo válido."
            );

            return;
        }


        // ------------------------------------------
        // USUÁRIO LOGADO
        // ------------------------------------------

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(
                "Erro ao verificar sessão:",
                sessionError
            );

            alert(
                "Não foi possível verificar seu login."
            );

            return;
        }


        const session =
            sessionData.session;


        if (!session) {

            alert(
                "Você precisa estar logado para cadastrar um pet."
            );

            return;
        }


        const user =
            session.user;


        // ------------------------------------------
        // CONVERTE SIM/NÃO PARA BOOLEAN
        // ------------------------------------------

        const microchipadoBoolean =
            microchipado.value === "sim";


        const castradoBoolean =
            castrado.value === "sim";


        // ------------------------------------------
        // ENVIA MÍDIA PARA O STORAGE
        // ------------------------------------------

        const midiaTipo =
            midia.type.startsWith("video/") ? "video" : "imagem";


        const extensao =
            midia.name
                .split(".")
                .pop()
                .toLowerCase();


        const nomeArquivo =
            `${user.id}/${crypto.randomUUID()}.${extensao}`;


        console.log(
            "Enviando mídia:",
            nomeArquivo
        );


        const {
            error: uploadError
        } =
            await supabaseClient
                .storage
                .from("videos")
                .upload(
                    nomeArquivo,
                    midia,
                    {
                        contentType:
                            midia.type,

                        cacheControl:
                            "3600",

                        upsert:
                            false
                    }
                );


        if (uploadError) {

            console.error(
                "Erro ao enviar mídia:",
                uploadError
            );

            alert(
                "Erro ao enviar a mídia para o Storage."
            );

            return;
        }


        // ------------------------------------------
        // PEGA URL DA MÍDIA
        // ------------------------------------------

        const {
            data: publicUrlData
        } =
            supabaseClient
                .storage
                .from("videos")
                .getPublicUrl(
                    nomeArquivo
                );


        const mediaUrl =
            publicUrlData.publicUrl;


        console.log(
            "URL da mídia:",
            mediaUrl
        );


        // ------------------------------------------
        // SALVA DADOS NA TABELA PETS
        // ------------------------------------------

        const petData = {

            user_id:
                user.id,

            nome:
                nome,

            especie:
                especie.value,

            raca:
                raca,

            idade:
                Number(idade),

            descricao:
                descricao || null,

            microchipado:
                microchipadoBoolean,

            castrado:
                castradoBoolean,

            media_url:
                mediaUrl,

            media_type:
                midiaTipo
        };


        console.log(
            "Dados que serão enviados:",
            petData
        );


        const {
            data: pet,
            error: insertError
        } =
            await supabaseClient
                .from("pets")
                .insert(petData)
                .select()
                .single();


        // ------------------------------------------
        // ERRO AO SALVAR PET
        // ------------------------------------------

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
                .remove([
                    nomeArquivo
                ]);


            alert(
                "A mídia foi enviada, mas os dados não puderam ser salvos no banco."
            );

            return;
        }


        // ------------------------------------------
        // SUCESSO
        // ------------------------------------------

        console.log(
            "Pet cadastrado:",
            pet
        );


        alert(
            `Pet "${nome}" cadastrado com sucesso!`
        );


        // ------------------------------------------
        // LIMPA FORMULÁRIO
        // ------------------------------------------

        form.reset();

        limparPreview();

    }

);