////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let ConnectedUser = localStorage.getItem('userSession');
let IsConnected = ConnectedUser == null ? false : true ;

Init_UI();
async function Init_UI() {
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {

    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    $("#createPost").hide();
    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
}
async function showPosts(reset = false) {
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm(loggedUser);
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
    $("#reloadPosts").addClass('white');
    $("#reloadPosts").on('click', async function () {
        $("#reloadPosts").addClass('white');
        postsPanel.resetScrollPosition();
        await showPosts();
    })
    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            // the etag contain the number of model records in the following form
            // xxx-etag
            let postsCount = parseInt(etag.split("-")[0]);
            if (currentETag != etag) {
                if (postsCount != currentPostsCount) {
                    console.log("postsCount", postsCount)
                    currentPostsCount = postsCount;
                    $("#reloadPosts").removeClass('white');
                } else
                    await showPosts();
                currentETag = etag;
            }
        }
    },
        periodicRefreshPeriod * 1000);
}

//
let loggedUser = {
    "Email": "Saliha.Yacoub@clg.qc.ca",
    "Password": "password",
    "Name": "Saliha Yacoub",
    "Avatar": "5b156ce0-46c0-11ee-9c7d-4dfffb69e19c.png",
    "Created": 1731790056,
    "VerifyCode": "verified",
    "Authorizations": {
        "readAccess": 2,
        "writeAccess": 2
    },
    "Verifycode": "verified",
    "Id": "5b156ce0-46c0-11ee-9c7d-4dfffb69e19c",
    "isSuper":true
}
//
//loggedUser = null;
//
async function renderPosts(queryString) {
    let endOfData = false;
    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    addWaitingGif();
    let response = await Posts_API.GetQuery(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        currentPostsCount = parseInt(currentETag.split("-")[0]);
        let Posts = response.data;
        if (Posts.length > 0) {
            for (let post of Posts) {
                let renderPostItem = await renderPost(post, loggedUser); // Attendre la résolution de renderPost
                postsPanel.append(renderPostItem); // Ajouter le post au DOM
            }
        } else
            endOfData = true;
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
async function getUserLikes(idPost) {
    let queryString = "?keywords=" + idPost
    let response = await Likes_API.GetQuery(queryString);
    if (!Likes_API.error) {
        currentETag = response.ETag;
        currentPostsCount = parseInt(currentETag.split("-")[0]);
        let Likes = response.data;
        if (Likes.length > 0) {
            return Likes;
        }
    } else {
        showError(Posts_API.currentHttpError);
    }
    return [];
}

async function renderPost(post, loggedUser) {
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let crudIcon = ``;
    let like = ``;
    if (loggedUser != null) {
        if (loggedUser.isAdmin) {
            $("#createPost").show();
            crudIcon +=
                `
                <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
                <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
                `;
        }
        if (loggedUser.isSuper) {
            $("#createPost").show();
            if(post.Owner == loggedUser.Id){
                crudIcon +=
                `
                <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
                <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
                `;
            }
        }

        let likes = await getUserLikes(post.Id)
        let title = "";
        let nbLike = 0;
        liker = false;
        console.log(likes);
        if (likes != undefined) {
            likes.forEach(like => {
                title += `${like.UserName} `
                if(like.IdUser == loggedUser.Id){
                    liker = true;
                }
            })
            nbLike = likes.length
        }   // fa-solid fa-regular qui appelle la fonction modifier Like
        if(liker){
            like += `<span class="likeCmd cmdIconSmall fa-solid fa-thumbs-up" onclick="modifierUnLike('${loggedUser.Id}','${post.Id}',true)" title="${title}">${nbLike}</span>`
        }
        else{
            like += `<span class="likeCmd cmdIconSmall fa-regular fa-thumbs-up" onclick="modifierUnLike('${loggedUser.Id}','${post.Id}')" title="${title}">${nbLike}</span>`
        }
    }
    crudIcon += like;
    //
    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div class="postOwnerContainer">
                <img class="userAvatar postOwner" src='${post.AvatarOwner}'/>
                <div class="userName  postOwner"> ${post.NameOwner} </div>
            </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function modifierUnLike(idUser, idPost, retirer = false){
    console.log("Modifier Like");
    if(retirer){
        let queryString = "?keywords=" + idPost
        let likeOwner = null;
        let response = await Likes_API.GetQuery(queryString);
        if (!Likes_API.error) {
            currentETag = response.ETag;
            currentPostsCount = parseInt(currentETag.split("-")[0]);
            let Likes = response.data;
            if (Likes.length > 0) {
                Likes.forEach(Like => {
                    if (Like.IdUser == idUser) {
                        likeOwner = Like;
                    }
                });
            }
        } else {
            showError(Likes_API.currentHttpError);
        }
        if (likeOwner != null) {
            await Likes_API.Delete(likeOwner.Id);
            if (!(Likes_API.currentStatus >= 400)) {
                await showPosts();
            }
            else {
                console.log(Likes_API.currentHttpError)
                showError("Une erreur est survenue!");
            }
        }
    }
    else {
        let data = { "IdUser": idUser, "IdPost": idPost }
        await Likes_API.Save(data);
        if (!Likes_API.error) {
            await showPosts();
        }
        else {
            console.log(Likes_API.currentHttpError)
            showError("Une erreur est survenue!");
        }
    }
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    if (!ConnectedUser) {

        DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="loginCmd">
            <i class="menuIcon fa fa-sign-in mx-2"></i> Connexion
        </div>
        `));
    }
    else {
        DDMenu.append($(`
            <div>
                    <img src="${ConnectedUser.Avatar}" alt="AvatarIMG" class="UserAvatarXSmall"/>${ConnectedUser.Name}
            </div>
            `));
        DDMenu.append($(`<div class="dropdown-divider"></div>`));
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="ModifyUser">
                <i class="fa-solid fa-users-gear"></i>Modification Profil
            </div>
            `));
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="logoutCmd">
                <i class="menuIcon fa-solid fa-right-to-bracket"></i> Déconnexion
            </div>
            `));
    }
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });
    $('#loginCmd').on('click', function () {
        showLogin();
    });
    $("#ModifyUser").on("click", function () {
        hidePosts();
        $('#abort').show();
        $("#viewTitle").text("Modifier l'utilisateur");
        $("#ConnexionForm").hide();
        renderUserForm(ConnectedUser);
    });
    $("#logoutCmd").on("click", function () {
        Accounts_API.Logout(ConnectedUser .Id);
    });
    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        postsPanel.scrollToElem($(this).attr("postId"));
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(loggedUser, Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    Post.Owner = "";
    return Post;
}
function renderPostForm(loggedUser, post = null) {
    let create = post == null;
    if (create) post = newPost();
    if (create) post.Owner = loggedUser.Id;
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="Owner" value="${post.Owner}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

//////////////////////// Accounts rendering /////////////////////////////////////////////////////////////////

function showLogin(newAccount = false) {
    hidePosts();
    $('#abort').show();
    $("#ConnexionForm").empty();
    $("#viewTitle").text("Connexion");
    let verifSend = "";
    if (newAccount) {
        verifSend = `
        <h2>Votre compte a été créé. Veuillez prendre vos courriels pour récupérer votre code de vérification qui vous sera demandé lors de votre prochaine connexion</h2>
        `;
    }
    $("#ConnexionForm").append(`
                <form class="form" id="loginForm">
                    ${verifSend}
                    <br>
                    <input 
                        class="form-control"
                        name="Email"
                        id="Email"
                        placeholder="Adresse courriel"
                        required
                        style="margin-bottom:10px;"
                    />
                    <input 
                        class="form-control"
                        name="Password" 
                        id="Password" 
                        placeholder="Mot de passe"
                        type="password"
                        required
                        style="margin-bottom:10px;"
                    />
                    <br>
                    <input type="button" value="Entrer"  style="width: 100%;" id="Connexion" class="btn btn-primary ">
                    <hr>
                    <input type="button" value="Nouveau compte" id="CreaterUser" style="width: 100%;" class="btn btn-info"/>
                </form>
                <p style="color: red;" id="errorContainerMsg"></p>
        `);
        $("#Connexion").on("click", function(e){
            e.preventDefault();
            Accounts_API.Connect($("#Email").val(),$("#Password").val());
        });
        $("#CreaterUser").on("click", function(){
            renderAccountForm();
        });
}

function showVerifyCode(){
    $('#vérification').apend(`
                <h2>Veuillez entrer le code de vérification que vous avez réçu par courriel</h2>
                <form class="form" id="VerifyForm">
                    <br>
                    <input type="text" name="VerifyCode" id="VerifyCode"
                    placeholder="Code de vérification de courriel"
                    RequireMessage="Veuillez entrer votre code de vérification"/>
                    <br>
                    <hr>
                    <input type="button" value="Vérifier" id="Verify" class="btn btn-primary">
                </form>
                <br>
                <p style="color: red;" id="errorContainerMsg"></p>
        `);
}

async function renderDeleteAccountForm(id) {
    let response = await Accounts_API.Get(id)
    if (!Accounts_API.error) {
        let Account = response.data;
        if (Account !== null) {
            let date = convertToFrenchDate(UTC_To_Local(Account.Date));
            $("#form").append(`
                <div class="Account" id="${Account.Id}">
                <div class="AccountHeader">  ${Account.Category} </div>
                <div class="AccountTitle ellipsis"> ${Account.Title} </div>
                <img class="AccountImage" src='${Account.Image}'/>
                <div class="AccountDate"> ${date} </div>
                <div class="AccountTextContainer showExtra">
                    <div class="AccountText">${Account.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".AccountText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Accounts_API.Delete(Account.Id);
                if (!Accounts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Accounts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Compte introuvable!");
        }
    } else
        showError(Accounts_API.currentHttpError);
}
function newAccount() {
    let Account = {};
    Account.Id = 0;
    Account.Name = "";
    Account.Email = "";
    Account.Password = "";
    Account.Avatar = "no-avatar.png";
    return Account;
}
function renderAccountForm(Account = null) {
    let create = Account == null;
    if (create) Account = newAccount();
    $("#ConnexionForm").hide();
    showForm();
    $("#viewTitle").text("Inscription");
    $("#form").append(`
        <form class="form" id="AccountForm">
            <input type="hidden" name="Id" id="Id" value="${Account.Id}"/>
             <div class= "EPform" >
                <label for="Email" class="form-label">Adresse de courriel </label>
                <input 
                    class="form-control  Email "
                    name="Email"
                    id="Email"
                    CustomErrorMessage="Ce courriel est déjà utilisé"
                    placeholder="Courriel"
                    required
                    value="${Account.Email}"
                    RequireMessage="Veuillez entrer votre courriel" 
                    InvalidMessage="Veuillez entrer un courriel valide"
                    style="margin-bottom:10px;"
                />
             
                <input 
                    class="form-control MatchedInput "
                    name="VerificationEmail"
                    id="VerificationEmail"
                    placeholder="Vérification"
                    required
                    matchedInputId="Email"
                    value="${Account.Email}"
                />
            </div>
            <div class= "EPform" >
                <label for="Password" class="form-label">Mot de passe </label>
                <input 
                    class="form-control "
                    name="Password" 
                    id="Password" 
                    placeholder="Password"
                
                    required
                    RequireMessage="Veuillez entrer un mot de passe"
                    value="${Account.Password}"
                    style="margin-bottom:10px;"
                    type="password"
                />
                <input 
                    class="form-control MatchedInput"
                    name="VerificationPassword" 
                    id="VerificationPassword" 
                    placeholder="Vérification"
                    matchedInputId="Password"
                    type="password"
                    required
                    value="${Account.Password}"
                />   
            </div>
            <div class= "EPform" >
                <label for="Name" class="form-label">Nom</label>
                <input 
                    class="form-control Alpha"
                    name="Name" 
                    id="Name" 
                    placeholder="Nom"
                    required
                    RequireMessage="Veuillez entrer un nom"
                    InvalidMessage="Le nom comporte un caractère illégal" 
                    value="${Account.Name}"
                /> 
            </div>
            <div class= "EPform" >
                   <label class="form-label">Avatar </label>
                <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${Account.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            </div>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary displayNone">
        </form>
    `);
    addConflictValidation("http://localhost:5000/accounts/conflict", "Email", "Id")
    initImageUploaders();
    initFormValidation();
    $("#commit").click(function () {
        $("#commit").off();
        return $('#saveUser').trigger("click");
    });
    $('#AccountForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#AccountForm"));
        post = await Accounts_API.Save(post, create);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}