const URL = "http://localhost:500/token";
const URLVerify = "http://localhost:500/accounts/verify";

function TryConnect(email, mdp){
    $.ajax({
        type: "Post",
        url: URL,
        data: JSON.stringify({ "Email": email, "Password": mdp }),
        contentType: "application/json",
        success: function(response){
            OnSuccessConnect(response.User);
        },
        error: function(xhr, status, error){
            if(xhr.responseJSON == undefined){
                OnErrorConnect("Le serveur ne répond pas")
            }
        }
    });
}