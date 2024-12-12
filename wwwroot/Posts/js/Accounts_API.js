
class Accounts_API {
    static Host_URL() { return "http://localhost:5000"; }
    static AccountS_API_URL() { return this.Host_URL() + "/api/users" };

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
    static async Get(access) {
        console.log("Allo");
        if (access == AccessControl.admin()) {
            Accounts_API.initHttpState();
            return new Promise(resolve => {
                $.ajax({
                    url: this.AccountS_API_URL() + (id != null ? "/" + id : ""),
                    complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                    error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
                });
            });
        }
    }

    static async GetUser(userId) {
        return new Promise(resolve => {
            $.ajax({
                url: API_URL + "/" + userId,
                success: user => { currentHttpError = ""; resolve(user); },
                error: (xhr) => { currentHttpError = xhr.responseJSON.error_description; resolve(null); }
            });
        });
    }
    static async Save(data, create = true) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.AccountS_API_URL() : this.AccountS_API_URL() + "/" + data.Id,
                type: create ? "Account" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Delete(email) {
        return new Promise(resolve => {
            $.ajax({
                url: this.AccountS_API_URL() + "/" + email,
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
}