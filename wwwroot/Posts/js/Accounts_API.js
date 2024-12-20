
class Accounts_API {
    static Host_URL() { return "http://localhost:5000"; }
    static AccountS_API_URL() { return this.Host_URL() + "/api/accounts" };

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.AccountS_API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Get(id = null) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.AccountS_API_URL() + (id != null ? "/" + id : ""),
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetUser(id) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.AccountS_API_URL() + "/getUser?id=" + id,
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetQuery(queryString = "") {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.AccountS_API_URL() + queryString,
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Save(data, create = true) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.AccountS_API_URL() + "/register" : "http://localhost:5000/accounts/modify/",
                type: create ? "Account" : "PUT",
                contentType: 'application/json',
                headers:{
                    "Authorization": `Bearer ${TokenAccount}`
                },
                data: JSON.stringify(data),
                success: (data) => {
                    resolve(false);
                    if(create){
                        showLogin(true);
                    }
                    else{
                        showAccounts();
                    }
                    
                },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Logout(id){
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url:   this.AccountS_API_URL() + `/logout?userId=${id}` ,
                type:    "GET" ,
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(xhr.status); }
            });
        });
    }
    static async Delete(id) {
        return new Promise(resolve => {
            $.ajax({
                url: this.AccountS_API_URL() + "/" + id,
                type: "DELETE",
                success: () => {
                    Accounts_API.initHttpState();
                    resolve(true);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }

    static Connect(Email, Password) {
        $.ajax({
            url: this.Host_URL() + "/token",
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify({ "Email": Email, "Password": Password }),
            success: function (response) {
                Accounts_API.SuccesConnect(response.User);
                TokenUser = response.Access_token;
            },
            error: function (xhr) {
                if (xhr.responseJSON == undefined) {
                    $("#errorContainerMsg").text("Le serveur ne répond pas");
                }
                else {
                    Accounts_API.Erreur(xhr.responseJSON.error_description);
                }
            }
        });
    }
    static Verify(id, code) {
        $.ajax({
            type: "GET",
            url: this.Host_URL() + "/accounts/verify",
            data: { id: id, code: code },
            success: function () {
                Accounts_API.SuccesCode();
            },
            error: function (xhr) {
                Accounts_API.ErrorConnect(xhr);
            }
        })
    }
    static async SuccesCode() {
        ConnectedUser = User;
        IsConnected = true;
        await showAccounts();
        
    }
    static async SuccesConnect(User) {
        ConnectedUser = User;
        console.log(User.VerifyCode);
        if (User.VerifyCode != "verified") {
            showVerifyCode();
        }
        else {
                const userTokenData = {
                    token: User.Access_token,
                    expireTime: User.Expire_Time,
                    user: {
                        id: User.Id,
                        name: User.Name,
                        email: User.Email,
                        avatar: User.Avatar
                    }
                };
            
            localStorage.setItem('userSession', JSON.stringify(userTokenData));
            await showPosts();
        }
    }
    static Erreur(message) {
        $("#errorContainerMsg").text(message);
    }
}