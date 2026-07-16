const express = require("express");
const fs = require("fs");

const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;

const config = require("./config");


const app = express();


const PORT = process.env.PORT || 3000;



// ==========================
// Middleware
// ==========================

app.use(express.json());

app.use(express.urlencoded({
    extended:true
}));


app.set("trust proxy",1);



app.use(session({

    secret:
    process.env.SESSION_SECRET || "legacy-zone-secret",

    resave:false,

    saveUninitialized:false,

    cookie:{

        secure:
        process.env.NODE_ENV === "production",

        sameSite:"lax"

    }

}));



app.use(passport.initialize());

app.use(passport.session());



app.use(express.static(__dirname));




// ==========================
// Database
// ==========================


const database="./database.json";


function getData(){


    if(!fs.existsSync(database)){


        fs.writeFileSync(

            database,

            JSON.stringify({

                events:[],

                updates:[]

            })

        );


    }



    return JSON.parse(

        fs.readFileSync(database,"utf8")

    );


}



function saveData(data){


    fs.writeFileSync(

        database,

        JSON.stringify(data,null,2)

    );


}




// ==========================
// Passport Discord
// ==========================


passport.serializeUser(

(user,done)=>{

    done(null,user);

});


passport.deserializeUser(

(user,done)=>{

    done(null,user);

});



passport.use(

new DiscordStrategy(

{

clientID:
config.discordClientID,


clientSecret:
config.discordClientSecret,


callbackURL:
config.callbackURL,


scope:["identify"]

},


(accessToken,refreshToken,profile,done)=>{


return done(null,profile);


}


)

);






// ==========================
// Admin Check
// ==========================


function isAdmin(req){


if(!req.user){

return false;

}


return config.admins.includes(req.user.id);


}





// ==========================
// Discord Login
// ==========================


app.get(

"/auth/discord",

passport.authenticate("discord")

);




app.get(
"/auth/discord/callback",

passport.authenticate("discord", {
    failureRedirect:"/login.html"
}),

(req,res)=>{

    res.redirect("/admin.html");

}

);






// ==========================
// Protect Admin
// ==========================


app.get("/admin.html",(req,res)=>{


    if(!isAdmin(req)){

        return res.redirect("/login.html");

    }


    res.sendFile(__dirname + "/admin.html");


});






// ==========================
// Check Admin API
// ==========================


app.get(

"/api/check-admin",

(req,res)=>{


if(!req.user){

return res.json({

admin:false

});

}



res.json({

admin:
isAdmin(req),


id:req.user.id,


username:req.user.username,


avatar:req.user.avatar


});


}

);






// ==========================
// Logout
// ==========================


app.get(

"/logout",

(req,res)=>{


req.logout(()=>{


req.session.destroy(()=>{


res.redirect("/login.html");


});


});


}

);







// ==========================
// Events
// ==========================


app.get(

"/api/events",

(req,res)=>{


const data=getData();


res.json(data.events);


}

);





app.post(

"/api/events",

(req,res)=>{


if(!isAdmin(req)){


return res.status(403).json({

success:false

});


}



const data=getData();



data.events.push({

id:Date.now(),

title:req.body.title,

date:req.body.date,

time:req.body.time,

location:req.body.location,

prize:req.body.prize,

description:req.body.description


});



saveData(data);



res.json({

success:true

});


}

);






// ==========================
// Updates
// ==========================


app.get(

"/api/updates",

(req,res)=>{


const data=getData();


res.json(data.updates);


}

);





app.post(

"/api/updates",

(req,res)=>{


if(!isAdmin(req)){


return res.status(403).json({

success:false

});


}



const data=getData();



data.updates.push({

id:Date.now(),

title:req.body.title,

message:req.body.message,

date:
new Date().toLocaleDateString("he-IL")


});



saveData(data);



res.json({

success:true

});


}

);







app.listen(PORT,()=>{


console.log(

`🚀 Server running on ${PORT}`

);


});