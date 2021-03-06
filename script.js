
var countdown;
var contacts = [];
var groups = [];
var lastCheckTime = -1;
var answerID;
var answerGroup;
var sidebarState = 0;

var MODE_NORMAL = 0;
var MODE_CREATEGROUP = 1;
var MODE_ADDMEMBER = 2;
var MODE_ADDCONTACT = 4;
var currentMode = MODE_NORMAL;

var theKey;
var notifications = 0;


function initialize() {
    refreshTitle();
	emoji.allow_native = false;
	emoji.use_css_imgs = true;
	window.setInterval(timer, 1000);
	countdown = 1;	

	$('#inputField').keydown(function(event) {
        if (event.shiftKey!=1 && event.keyCode == 13 && $("#inputFieldWrapper").css("visibility") === "visible" && $("#refresh_button").attr("disabled") === undefined) {
            sendMessage();
            return false;
         }
    });	
	
	$(".emoji-tab img").click(function() {
		var cursorPos = $('#inputField').prop('selectionStart'),
		v = $('#inputField').val(),
		textBefore = v.substring(0, cursorPos ),
		textAfter = v.substring(cursorPos, v.length);
		var idx = $(this).attr("class").substring($(this).attr("class").indexOf("-") + 1, $(this).attr("class").indexOf(" ", $(this).attr("class").indexOf("-")));
		$('#inputField').val(textBefore + emoji.data[idx][0][0] + textAfter );
	});
	
	$("#content").mCustomScrollbar({
	    theme: "minimal-dark",
	    mouseWheelPixels: 150 
	});

	$(".emoji-tab").mCustomScrollbar({
	    theme: "minimal-dark"
	});

	$("#contacts").mCustomScrollbar({
	    theme: "minimal-dark"
	});

	$("#groups").mCustomScrollbar({
	    theme: "minimal-dark"
	});

	clearInputFile();
}

function setKey() {
    theKey = $("#key").val();
    $("#key").css("display", "none");
    $("#keyOK").css("display", "none");
    $("#refresh_button").css("display", "initial");
    initialize();
}

function switchSidebar() {
    if (sidebarState === 0) {
        $("#groupsContacts").animate({
            marginLeft: -($('#contacts').width())
        }, 300);
        sidebarState = 1;
    } else if (sidebarState === 1) {
        $("#groupsContacts").animate({
            marginLeft: 0
        }, 300);
        sidebarState = 0;
    }
}


function answerButtonOnClick(group, id)
{    
    if (group && currentMode !== MODE_NORMAL)
        return;

    if (currentMode === MODE_ADDMEMBER) {
        addMember(answerGroup, id);
        return;
    } 

    if (id !== '0') {
        var cssID;
        if (group)
            cssID = "#g" + idFromJid(id);
        else
            cssID = "#s" + idFromJid(id);

        if ($(cssID).length === 0)
            openChat(group, id);

        $(".chat_active").removeClass("chat_active");
        $(cssID).addClass("chat_active");

        $('#content').mCustomScrollbar("scrollTo", $(cssID + " .answer_button"), {});

        setTimeout(function () {
            $('#inputField').focus();
        }, 0);

        answerGroup = group;
        answerID = id;
        showInputField();
    }
}

function listen() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4) {
            if (xmlhttp.responseText !== "") {
                console.log("Error occured in listen():" + xmlhttp.responseText);
                alert("Error occured in listen()");
            }
            else
                window.setTimeout(listen, 100);
        }
    }
    xmlhttp.open("GET", "listen.php", true);
    xmlhttp.send();
}

function cancelCurrentMode()
{
    currentMode = MODE_NORMAL;
    $("#overlay").css("display", "none");

}

function switchToMode(mode)
{
    var text = "";
    if (mode === MODE_ADDCONTACT) {
        text = "Create a new contact...";
    } else if (mode === MODE_ADDMEMBER) {
        text = "Add a member to the group...";
        switchSidebar();
    } else if (mode === MODE_CREATEGROUP) {
        text = "Create a new group...";
        switchSidebar();
    }
    currentMode = mode;
    $("#overlay").css("display", "initial");
    $("#overlay-text").html(text);
}

function showInputField()
{    
	$("#inputFieldWrapper").css("visibility", "visible");
}
	
function hideInputField()
{
    cancelCurrentMode();
	$("#inputFieldWrapper").css("visibility", "hidden");
	$(".chat_active").removeClass("chat_active");
}	

function refresh()
{
	$("#refresh_button").attr("disabled", "disabled");
	$("#refresh_button").text("Refreshing...");
	
	getNews();
}

function restartTimer()
{
	$('#refresh_button').removeAttr("disabled");
	countdown = 10;	
}

function timer()
{
	if (countdown > 0)
	{
		countdown--;
		if (countdown === 0)
		{
			refresh();
		}
		else
		{
			$("#refresh_button").text("Autorefresh in " + countdown + " seconds");
		}
	}
}

function getContentOfXMLTag(parent, tagName)
{
    return parent.getElementsByTagName(tagName)[0].textContent
}

function getNews()
{
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange=function()
	{
		if (xmlhttp.readyState==4 && xmlhttp.status==200)
		{
		    parser = new DOMParser();
		    xmlDoc = parser.parseFromString($.jCryption.decrypt(xmlhttp.responseText, theKey), "text/xml");
		    documentXML = xmlDoc.documentElement;
		    messages = documentXML.getElementsByTagName("Message");
		    // Contacts
		    contactsXML = documentXML.getElementsByTagName("Contact");
		    for (i = 0; i < contactsXML.length; i++) {
		        var id = getContentOfXMLTag(contactsXML[i], "ID");
		        contacts[id] = [];
		        contacts[id]["id"] = id;
		        contacts[id]["name"] = getContentOfXMLTag(contactsXML[i], "Name");
		        contacts[id]["lastSeen"] = getContentOfXMLTag(contactsXML[i], "LastSeen");
		        contacts[id]["status"] = getContentOfXMLTag(contactsXML[i], "Status");
		        resource = contactsXML[i].getElementsByTagName("Resource");
		        if (resource.length > 0) {
		            contacts[id]["thumbnailPicture"] = getContentOfXMLTag(resource[0], "ThumbnailPath");
		            contacts[id]["picture"] = getContentOfXMLTag(resource[0], "Path");
		            contacts[id]["thumbnailHeight"] = getContentOfXMLTag(resource[0], "ThumbnailHeight");
		            contacts[id]["thumbnailWidth"] = getContentOfXMLTag(resource[0], "ThumbnailWidth");
		        }
		        else {
		            contacts[id]["picture"] = "";
		            contacts[id]["thumbnailPicture"] = "";
		            contacts[id]["thumbnailHeight"] = "";
		            contacts[id]["thumbnailWidth"] = "";
		        }
		        if (id != "0")
		            addContact(contacts[id]);
		    }
		    // Change contact picture
		    contactPictureChanges = documentXML.getElementsByTagName("ContactPicture");
		    for (i = 0; i < contactPictureChanges.length; i++) {
		        var id = getContentOfXMLTag(contactPictureChanges[i], "ID");
		        resource = contactPictureChanges[i].getElementsByTagName("Resource");
		        if (resource.length > 0) {
		            contacts[id]["thumbnailPicture"] = getContentOfXMLTag(resource[0], "ThumbnailPath");
		            contacts[id]["picture"] = getContentOfXMLTag(resource[0], "Path");
		            contacts[id]["thumbnailHeight"] = getContentOfXMLTag(resource[0], "ThumbnailHeight");
		            contacts[id]["thumbnailWidth"] = getContentOfXMLTag(resource[0], "ThumbnailWidth");
		        }
		        setPictureOfContact(id);
		    }
		    // Change contact lastSeen
		    contactLastSeenChanges = documentXML.getElementsByTagName("ContactLastSeen");
		    for (i = 0; i < contactLastSeenChanges.length; i++) {
		        var id = getContentOfXMLTag(contactLastSeenChanges[i], "ID");
		        if (contacts[id]) {
		            contacts[id]["lastSeen"] = getContentOfXMLTag(contactLastSeenChanges[i], "LastSeen");
		            setLastSeenOfContact(getContentOfXMLTag(contactLastSeenChanges[i], "ID"), contacts[id]["lastSeen"]);
		        }
		    }
		    // Change contact status
		    contactStatusChanges = documentXML.getElementsByTagName("ContactStatus");
		    for (i = 0; i < contactStatusChanges.length; i++) {
		        var id = getContentOfXMLTag(contactStatusChanges[i], "ID");
		        contacts[id]["status"] = getContentOfXMLTag(contactStatusChanges[i], "Status");
		        setStatusOfContact(getContentOfXMLTag(contactStatusChanges[i], "ID"), contacts[id]["status"]);
		    }
		    // Change contact composing
		    contactComposingChanges = documentXML.getElementsByTagName("ContactComposing");
		    for (i = 0; i < contactComposingChanges.length; i++) {
		        setLastSeenOfContact(getContentOfXMLTag(contactComposingChanges[i], "ID"), "Writing...");
		    }
		    // Change contact paused
		    contactPausedChanges = documentXML.getElementsByTagName("ContactPaused");
		    for (i = 0; i < contactPausedChanges.length; i++) {
		        var id = getContentOfXMLTag(contactPausedChanges[i], "ID");
		        setLastSeenOfContact(id, contacts[id]["lastSeen"]);
		    }
		    // Groups
		    groupsXML = documentXML.getElementsByTagName("Group");
		    for (var i = 0; i < groupsXML.length; i++) {
		        var id = getContentOfXMLTag(groupsXML[i], "ID");
		        groups[id] = [];
		        groups[id]["id"] = id;
		        groups[id]["name"] = getContentOfXMLTag(groupsXML[i], "Name");
		        resource = groupsXML[i].getElementsByTagName("Resource");
		        if (resource.length > 0) {
		            groups[id]["thumbnailPicture"] = getContentOfXMLTag(resource[0], "ThumbnailPath");
		            groups[id]["picture"] = getContentOfXMLTag(resource[0], "Path");
		            groups[id]["thumbnailWidth"] = getContentOfXMLTag(resource[0], "ThumbnailWidth");
		            groups[id]["thumbnailHeight"] = getContentOfXMLTag(resource[0], "ThumbnailHeight");
		        }
		        else {
		            groups[id]["picture"] = "";
		            groups[id]["thumbnailPicture"] = "";
		            groups[id]["thumbnailWidth"] = "";
		            groups[id]["thumbnailHeight"] = "";
		        }
		        groups[id]["members"] = [];
		        membersXML = groupsXML[i].getElementsByTagName("Member");
		        for (l = 0; l < membersXML.length; l++) {
		            groups[id]["members"][l] = [];
		            groups[id]["members"][l]["id"] = getContentOfXMLTag(membersXML[l], "ID");
		            groups[id]["members"][l]["admin"] = getContentOfXMLTag(membersXML[l], "Admin") === "1" || getContentOfXMLTag(membersXML[l], "Admin") === "2";
		        }
		        addGroup(groups[id]);
		    }
		    // Change group name
		    groupsNameChanges = documentXML.getElementsByTagName("GroupName");
		    for (i = 0; i < groupsNameChanges.length; i++) {
		        var id = getContentOfXMLTag(groupsNameChanges[i], "ID");
		        groups[id]["name"] = getContentOfXMLTag(groupsNameChanges[i], "Name");
		        setNameOfGroup(getContentOfXMLTag(groupsNameChanges[i], "ID"), groups[id]["name"]);
		    }
		    // Change group picture
		    groupsPictureChanges = documentXML.getElementsByTagName("GroupPicture");
		    for (i = 0; i < groupsPictureChanges.length; i++) {
		        var id = getContentOfXMLTag(groupsPictureChanges[i], "ID");
		        resource = groupsPictureChanges[i].getElementsByTagName("Resource");
		        if (resource.length > 0) {
		            groups[id]["thumbnailPicture"] = getContentOfXMLTag(resource[0], "ThumbnailPath");
		            groups[id]["picture"] = getContentOfXMLTag(resource[0], "Path");
		            groups[id]["thumbnailWidth"] = getContentOfXMLTag(resource[0], "ThumbnailWidth");
		            groups[id]["thumbnailHeight"] = getContentOfXMLTag(resource[0], "ThumbnailHeight");
		        }
		        else {
		            groups[id]["picture"] = "";
		            groups[id]["thumbnailPicture"] = "";
		            groups[id]["thumbnailWidth"] = "";
		            groups[id]["thumbnailHeight"] = "";
		        }
		        setPictureOfGroup(id);
		    }
		    // Change group members
		    groupsMembers = documentXML.getElementsByTagName("GroupMembers");
		    for (i = 0; i < groupsMembers.length; i++) {
		        var id = getContentOfXMLTag(groupsMembers[i], "ID");
		        groups[id]["members"] = [];
		        membersXML = groupsMembers[i].getElementsByTagName("Member");
		        for (l = 0; l < membersXML.length; l++) {
		            groups[id]["members"][l] = [];
		            groups[id]["members"][l]["id"] = getContentOfXMLTag(membersXML[l], "ID");
		            groups[id]["members"][l]["admin"] = getContentOfXMLTag(membersXML[l], "Admin") === "1" || getContentOfXMLTag(membersXML[l], "Admin") === "2";
		        }
		        setMembersOfGroup(id);
		    }
            // Open chats
		    for (i = 0; i < messages.length; i++)
		    {
		        id = getContentOfXMLTag(messages[i], "ChatID");
		        if (getContentOfXMLTag(messages[i], "Type") === "group")
				{
		            if ($("#g" + idFromJid(id)).length === 0)
					{
		                openChat(true, id);
		            }
		            else
		            {
		                bringChatToTop(true, id);
		            }
				}
				else
				{
		            if ($("#s" + idFromJid(id)).length === 0)
					{
		                openChat(false, id);
		            }
		            else 
		            {
		                bringChatToTop(false, id);
		            }
				}
		    }
            // Open messages
		    for (i = 0; i < messages.length; i++)
			{ 
		        message = [];
		        resource = messages[i].getElementsByTagName("Resource");
		        if (resource.length > 0)
				{
		            message["resourceType"] = getContentOfXMLTag(resource[0], "Type");
		            message["resourceThumbnailPath"] = getContentOfXMLTag(resource[0], "ThumbnailPath");
		            message["resourcePath"] = getContentOfXMLTag(resource[0], "Path");
		            message["resourceThumbnailWidth"] = getContentOfXMLTag(resource[0], "ThumbnailHeight");
		            message["resourceThumbnailHeight"] = getContentOfXMLTag(resource[0], "ThumbnailWidth");
				}
				else
				{
		            message["resourceType"] = "";
		            message["resourceThumbnailPath"] = "";
		            message["resourcePath"] = "";
		            message["resourceThumbnailWidth"] = "";
		            message["resourceThumbnailHeight"] = "";
		        }
		        message["group"] = getContentOfXMLTag(messages[i], "Type") === "group";
		        message["chatID"] = getContentOfXMLTag(messages[i], "ChatID");
		        message["messageID"] = getContentOfXMLTag(messages[i], "ID");
		        message["whatsID"] = getContentOfXMLTag(messages[i], "WID");
		        message["text"] = getContentOfXMLTag(messages[i], "Text");
		        message["senderID"] = getContentOfXMLTag(messages[i], "Sender");
		        message["time"] = getContentOfXMLTag(messages[i], "Time");
		        message["status"] = getContentOfXMLTag(messages[i], "Status");
		        addMessage(message, lastCheckTime != -1 && message["senderID"] != 0);
		    }
            // Change Message Status
		    messageStatusChanges = documentXML.getElementsByTagName("MessageStatus");
		    for (i = 0; i < messageStatusChanges.length; i++)
		    {
		        setStatusOfMessage(getContentOfXMLTag(messageStatusChanges[i], "ID"), getContentOfXMLTag(messageStatusChanges[i], "Status"));
		    }
		    // Change Message time
		    messageTimeChanges = documentXML.getElementsByTagName("MessageTime");
		    for (i = 0; i < messageTimeChanges.length; i++) {
		        setTimeOfMessage(getContentOfXMLTag(messageTimeChanges[i], "ID"), getContentOfXMLTag(messageTimeChanges[i], "Time"));
		    }
		    // Change Message Thumbnail
		    messageThumbnailChanges = documentXML.getElementsByTagName("MessageThumbnail");
		    for (i = 0; i < messageThumbnailChanges.length; i++) {
		        setThumbnailOfMessage(getContentOfXMLTag(messageThumbnailChanges[i], "ID"), getContentOfXMLTag(messageThumbnailChanges[i], "ThumbnailPath"), getContentOfXMLTag(messageThumbnailChanges[i], "ThumbnailWidth"), getContentOfXMLTag(messageThumbnailChanges[i], "ThumbnailHeight"));
		    }
		    if (lastCheckTime === -1)
		    {
		        listen();
		    }
		    lastCheckTime = getContentOfXMLTag(documentXML, "LastCheckTime");
		    restartTimer();
		}
	}
	xmlhttp.open("POST", "getNews.php", true);
	xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	xmlhttp.send("lastCheckTime=" + lastCheckTime);
}

function addContact(contact)
{
    $("#add-contact-button").after("<div class=\"contact mdl-card mdl-shadow--2dp\" id=\"c" + idFromJid(contact["id"]) + "\" >" + getCodeForPicture(contact["picture"], contact["thumbnailPicture"], "contacts", contact["name"], contact["thumbnailWidth"], contact["thumbnailHeight"]) + "<div class=\"contact_info\" onclick=\"answerButtonOnClick(false,'" + contact["id"] + "')\" ><div class=\"name\">" + emoji.replace_unified(contact["name"]) + "</div><div class=\"lastSeen\">" + contact["lastSeen"] + "</div></div></div>");
    refreshLightbox('#contacts', 'contacts');
}

function addGroup(group) {
    groupHTML = "<div class=\"group mdl-card mdl-shadow--2dp\" id=\"c" + idFromJid(group["id"]) + "\" ><div class=\"group-header\">" + getCodeForPicture(group["picture"], group["thumbnailPicture"], "groups", group["name"], group["thumbnailWidth"], group["thumbnailHeight"]) + "<div class=\"group_info\" onclick=\"answerButtonOnClick(true,'" + group["id"] + "')\" ><div class=\"name\">" + emoji.replace_unified(group["name"]) + "</div><div class=\"lastSeen\">" + "</div></div><div class=\"mdl-button mdl-js-button mdl-button--icon \" onclick=\"expandGroup('" + idFromJid(group["id"]) + "')\" ><i class=\"material-icons\">expand_more</i></div></div>";
    var adminChangeable = false;
    for (var i = 0; i < group["members"].length; i++) {
        if (group["members"][i]["id"] === "0") {
            adminChangeable = group["members"][i]["admin"];
        }
    }
    for (var i = 0; i < group["members"].length; i++) {
        groupHTML += "<div class=\"group-details-small\" ><div class=\"contact-small mdl-card mdl-shadow--2dp mdl-color--primary\" onclick=\"answerButtonOnClick(false,'" + group["members"][i]["id"] + "')\" >" + contacts[group["members"][i]["id"]]["name"] + "</div>";
        groupHTML += "<div class=\"member-admin\"><i class=\"material-icons " + (group["members"][i]["admin"] ? "admin-active" : "admin-inactive") + (adminChangeable && group["members"][i]["id"] !== "0" ? " admin-changeable \"  onclick=\"changeRole('" + group["id"] + "', '" + group["members"][i]["id"] + "')\"" : "\"") + " >grade</i></div>";
        if (adminChangeable)
            groupHTML += "<div class=\"member-remove\"><i class=\"material-icons\" " + (group["members"][i]["id"] !== "0" ? "onclick=\"removeMember('" + group["id"] + "', '" + group["members"][i]["id"] + "')\"" : "" ) + " >remove_circle</i></div>";
        groupHTML += "</div>";
    }
    if (adminChangeable)
        groupHTML += "<div class=\"group-details-small\" ><div class=\"member-add mdl-button mdl-js-ripple-effect mdl-js-button mdl-color--accent\" onclick=\"newMember('" + group["id"] + "')\" >Add member</div></div>";
    groupHTML += "</div>";
    $("#create-group-button").after(groupHTML);
    refreshLightbox('#groups', 'groups');
}

function expandGroup(id)
{
    if ($("#c" + id + " .mdl-button i").html() === "expand_more") {
        $("#c" + id + " .mdl-button i").html("expand_less");
        $("#c" + id + " .group-details-small").addClass("group-details-small-shown");
    }
    else {
        $("#c" + id + " .mdl-button i").html("expand_more");
        $("#c" + id + " .group-details-small").removeClass("group-details-small-shown");
    }
}

function setLastSeenOfContact(id, newLastSeen)
{
    $("#c" + idFromJid(id) + " .lastSeen").html(newLastSeen);
    $("#s" + idFromJid(id) + " .lastSeen").html(newLastSeen);
}

function setStatusOfContact(id, newStatus) {
    $("#s" + idFromJid(id) + " .status").html(emoji.replace_unified(newStatus));
}

function setPictureOfContact(id) {
    $("#c" + idFromJid(id) + " .card-image ").css("background-image", "url(" + contacts[id]["thumbnailPicture"] + ")");
    $("#c" + idFromJid(id) + " .lggroups ").attr("data-exthumbimage", contacts[id]["picture"]);
    $("#s" + idFromJid(id) + " .card-image ").css("background-image", "url(" + contacts[id]["thumbnailPicture"] + ")");
    $("#s" + idFromJid(id) + " .lgchats ").attr("data-exthumbimage", contacts[id]["picture"]);
}

function setNameOfGroup(id, name) {
    $("#c" + idFromJid(id) + " .name ").html(emoji.replace_unified(name));
    $("#g" + idFromJid(id) + " .name").html(emoji.replace_unified(name));
}

function setPictureOfGroup(id) {
    $("#c" + idFromJid(id) + " .card-image ").css("background-image", "url(" + groups[id]["thumbnailPicture"] + ")");
    $("#c" + idFromJid(id) + " .lggroups ").attr("data-exthumbimage", groups[id]["picture"]);
    $("#g" + idFromJid(id) + " .card-image ").css("background-image", "url(" + groups[id]["thumbnailPicture"] + ")");
    $("#g" + idFromJid(id) + " .lgchats ").attr("data-exthumbimage", groups[id]["picture"]);
}

function setMembersOfGroup(id) { 
    $("#c" + idFromJid(id) + " .group-details-small").remove();
    var adminChangeable = false;
    for (var i = 0; i < groups[id]["members"].length; i++) {
        if (groups[id]["members"][i]["id"] === "0") {
            adminChangeable = groups[id]["members"][i]["admin"];
        }
    }
    var expanded = $("#c" + idFromJid(id) + " .mdl-button i").html() === "expand_less";
    var membersHTML = "";
    for (var i = 0; i < groups[id]["members"].length; i++) {
        membersHTML += "<div class=\"group-details-small " + ( expanded ? " group-details-small-shown" : "" ) + "\" ><div class=\"contact-small mdl-card mdl-shadow--2dp mdl-color--primary\" onclick=\"answerButtonOnClick(false,'" + groups[id]["members"][i]["id"] + "')\" >" + contacts[groups[id]["members"][i]["id"]]["name"] + "</div>";
        membersHTML += "<div class=\"member-admin\"><i class=\"material-icons " + (groups[id]["members"][i]["admin"] ? "admin-active" : "admin-inactive") + (adminChangeable && groups[id]["members"][i]["id"] !== "0" ? " admin-changeable" : "") + "\" onclick=\"changeRole('" + groups[id]["id"] + "', '" + groups[id]["members"][i]["id"] + "')\" >grade</i></div>";
        if (adminChangeable)
            membersHTML += "<div class=\"member-remove\"><i class=\"material-icons\" " + (groups[id]["members"][i]["id"] !== "0" ? " onclick=\"removeMember('" + groups[id]["id"] + "', '" + groups[id]["members"][i]["id"] + "')\"" : "" ) + " >remove_circle</i></div></div>";
        else
            membersHTML += "</div>";
    }
    if (adminChangeable) 
        membersHTML += "<div class=\"group-details-small " + ( expanded ? " group-details-small-shown" : "" ) + "\" ><div class=\"member-add mdl-button mdl-js-ripple-effect mdl-js-button mdl-color--accent\" onclick=\"newMember('" + groups[id]["id"] + "')\" >Add member</div></div>";
    $("#c" + idFromJid(id)).append(membersHTML);
   
}

function ackNotification(id)
{
    $("#" + id).removeClass("message-new");
    $("#" + id).attr("onmouseover", "");
    notifications--;
    refreshTitle();
}

function refreshTitle()
{
    document.title = "Chat" + (notifications > 0 ? " (" + notifications + ")" : "");
}


function addMessage(message, notify)
{
    var newMessage = "<div id=\"m" + message["messageID"] + "\" ";
    if (notify) {
        notifications++;
        refreshTitle();
        newMessage += "onmouseover=\"ackNotification('m" + message["messageID"] + "')\" ";
    }
    newMessage += "class=\"mdl-card mdl-shadow--2dp message ";
    if (notify)
        newMessage += "message-new ";

    if (message["senderID"] == 0)
	{
		newMessage += "message_own\"";
		newMessage += " ><div class=\"message_header mdl-card__title \">";
    }
    else if (message["senderID"] == -1)
    {
        newMessage += "message_status\">";
    }
    else 
	{
		newMessage += "message_other\"";
		newMessage += " ><div class=\"message_header mdl-card__title mdl-color--primary-dark\">";
    }
    if (message["senderID"] != -1) {
        newMessage += contacts[message["senderID"]]["name"] + "<div class = \"message-status\" ";

        if (message["senderID"] != 0 && message["status"] != 4)
            newMessage += "onClick=\"setMessageAsRead('" + message["messageID"] + "','" + message["whatsID"] + "','" + (message["group"] == "1" ? message["chatID"] : "") + "','" + message["senderID"] + "')\" ";

        newMessage += "><span class=\"message-status-read message-status-off\">I</span><span class=\"message-status-received message-status-off\">I</span><span class=\"message-status-send message-status-off\">I</span></div>";
        newMessage += "</div>";
    }
    newMessage += "<div class=\"message_body mdl-color-text--grey-700 mdl-card__supporting-text\">";
	if (message["resourceType"] === "picture")
	{
	    newMessage += "<div class=\"message_resource\">" + getCodeForPicture(message["resourcePath"], message["resourceThumbnailPath"], "message", "Von " + contacts[message["senderID"]]["name"], message["resourceThumbnailWidth"], message["resourceThumbnailHeight"]) + "</div>";
	}
	else if (message["resourceType"] === "video") {
	    newMessage += "<div class=\"message_resource\">" + getCodeForVideo(message["resourcePath"], message["resourceThumbnailPath"], "message" , "Von " + contacts[message["senderID"]]["name"]) + "</div>";
	}
	else if (message["resourceType"] === "audio") {
	    newMessage += "<div class=\"message_resource\">" + getCodeForAudio(message["resourcePath"]) + "</div>";
	}

	newMessage += "<div>" + emoji.replace_unified(message["text"]) + "</div>";
	newMessage += "<div class=\"message-time\">" + message["time"] + "</div>";
	newMessage += "</div></div>";
	
	var chat;
	if (message["group"])
	    chat = "#g" + idFromJid(message["chatID"]) + " .messages";
	else
	    chat = "#s" + idFromJid(message["chatID"]) + " .messages"
	$(chat + " .messages-space").before(newMessage);

	setStatusOfMessage(message["messageID"], message["status"]);

	if (message["resourceType"] === 'video' || message["resourceType"] === 'picture') {
	    refreshLightbox(chat, "message");
	} else if (message["resourceType"] === 'audio') {
        refreshAudioplayer("#m" + message["messageID"] + " .audio");
	}

	var scrollWidth = $("#m" + message["messageID"] + " .message_body div:first-child")[0].scrollWidth;
	var width = Math.max(150, scrollWidth + 10);
	$("#m" + message["messageID"]).css("width", width + "px");
	$("#m" + message["messageID"]).css("min-width", width + "px");

	$(chat).clearQueue();
	var lastOffset = $(chat).children().eq(-2).offset().left;
	var firstOffset = $(chat).children().first().offset().left;
	var offset = lastOffset - firstOffset;
	$(chat).animate({ 
        scrollLeft: offset
	}, 1000);

	

}



function refreshLightbox(gallery, group) {
    if ($(gallery).data('lightGallery') !== undefined)
        $(gallery).data('lightGallery').destroy(true);
    else
    {
        $(gallery).on('onBeforeSlide.lg', function (event, prevIndex, index) {
             loadLightboxImage(event, prevIndex, index);
        });

        $(gallery).on('onBeforeOpen.lg', function (event) {
            lightBoxOpened = true;
        });

        $(gallery).on('onAferAppendSlide.lg', function (event, index) {
            if (lightBoxOpened)
            {
                lightBoxOpened = false;
                loadLightboxImage(event, 0, index);
            }            
        });
    }

    $(gallery).lightGallery({
        selector: ".lg" + group,
        exThumbImage: 'data-exthumbimage',
        showThumbByDefault: false,
        download: false,
    });

   
}

function loadLightboxImage(event, prevIndex, index) {
    var element = $(".lg .lg-item").eq(index).find(".lg-image");
    if (element.length > 0 && !element.attr("base64Loaded"))
    {
        element.attr("base64Loaded", "true");
        getMedia(element.attr("src"), element, false, "picture");
    }
    element = $(".lg .lg-item").eq(index).find(".lg-video source");
    if (element.length > 0 && !element.attr("base64Loaded")) {
        element.attr("base64Loaded", "true");
        getMedia(element.attr("src"), element, false, "video");
    }
}

function refreshAudioplayer(selector) {        
    $(selector).mb_miniPlayer({
        skin: 'orange',
        autoPlay: false,
        inLine: true,
        showVolumeLevel: false,
        showRew: false,
        showTime: false,
        width: 100,
        addShadow: false
    });
}

function setStatusOfMessage(messageID, status)
{
    if (status >= 2)    
        $("#m" + messageID + " .message-status-send").addClass("message-status-on").removeClass("message-status-off");
    if (status >= 3)
        $("#m" + messageID + " .message-status-received").addClass("message-status-on").removeClass("message-status-off");
    if (status >= 4)
        $("#m" + messageID + " .message-status-read").addClass("message-status-on").removeClass("message-status-off");
}

function setTimeOfMessage(messageID, time) {
     $("#m" + messageID + " .message-time").html(time);  
}

function setThumbnailOfMessage(messageID, thumbnail, width, height)
{
    getMedia(thumbnail, "#m" + messageID, true, "picture");

    if (width > 0 && height > 0) {
        $("#m" + messageID + " .card-image").css("width", width + " px");
        $("#m" + messageID + " .card-image").css("height", height + " px");
    }
}

function bringChatToTop(group, id)
{
    var chat;
    if (group)
        chat = "#g" + idFromJid(id);
    else
        chat = "#s" + idFromJid(id);
    var scollPrev = $(chat + " .messages").scrollLeft();
    $(chat).prependTo("#chats");
    $(chat + " .messages").scrollLeft(scollPrev);
}

function openChat(group, id)
{
    var newChat = "<div class=\"mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col chat\" id=\"" + (group ? "g" : "s") + idFromJid(id) + "\"><div class=\"mdl-color--primary-dark chat_description\">";
	if (group === false)
	{		
	    newChat += "<h4>" + emoji.replace_unified(contacts[id]["name"]) + "</h4>";
	    newChat += "<div class=\"chat_picture\">" + getCodeForPicture(contacts[id]["picture"], contacts[id]["thumbnailPicture"], "chats", contacts[id]["name"], contacts[id]["thumbnailWidth"], contacts[id]["thumbnailHeight"]) + "</div>";
		newChat += "<p>" + "<span class=\"status\">" + emoji.replace_unified(contacts[id]["status"]) + "</span></p>";
		newChat += "<p><i class=\"material-icons\">phone</i> +" + "<span class=\"number\">" + idFromJid(id) + "</span></p>";
		newChat += "<p><span class=\"lastSeen\">" + contacts[id]["lastSeen"] + "</span></p>";
	}
	else
	{
	    newChat += "<h4 class=\"name\">" + emoji.replace_unified(groups[id]["name"]) + "</h4>";
	    newChat += "<div class=\"chat_picture\">" + getCodeForPicture(groups[id]["picture"], groups[id]["thumbnailPicture"], "chats", groups[id]["name"], groups[id]["thumbnailWidth"], groups[id]["thumbnailHeight"]) + "</div>";
	}
	newChat += "</div><button class=\"answer_button mdl-button mdl-js-ripple-effect mdl-js-button mdl-button--fab mdl-color--accent\" ";
	newChat += "onclick=\"answerButtonOnClick(" + group + ",'" + id + "')\"";
	newChat +=" ><i class=\"material-icons mdl-color-text--white\" role=\"presentation\">reply</i><span class=\"visuallyhidden\">reply</span></button><div class=\"mdl-card__supporting-text messages\"><div class=\"messages-space\"></div></div></div>";	
	$("#chats").prepend(newChat);

	refreshLightbox("#chats", "chats");
}

function clearInputFile()
{
    $("#inputFile").val("");
}

function sendMessage()
{
    var onreadystatechange = function (xmlhttp)
	{
		if (xmlhttp.readyState==4 && xmlhttp.status==200)
		{
		    clearInputFile();
			document.getElementById("inputField").value = "";
			setTimeout(function () {
			    getNews();
			}, 1000);
			hideInputField();
			$('#content').mCustomScrollbar("scrollTo", "0", {});
		}
		$('#refresh_button').removeAttr("disabled");
	}

	var strings = [];
	strings["id"] = answerID;
	strings["group"] = answerGroup ? "1" : "0";
	strings["message"] = document.getElementById("inputField").value;

	send(strings, "sendMessage.php", onreadystatechange, document.getElementById("inputFile").files[0]);
	$("#refresh_button").attr("disabled", "disabled");
}

function send(strings, url, onreadystatechange, file, cache) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        onreadystatechange(xmlhttp);
    }

    var urlParam = "";
    if (cache)
    {
        urlParam = "?";
        var first = true;
        for (var key in strings)
        {
            if (!first)  
                urlParam += "&";
            else
                first = false;
            urlParam += key + "=" + encodeURIComponent(strings[key], theKey);
        }
    }
    xmlhttp.open(cache ? "GET" : "POST", url + urlParam, true);
  

    var formData = new FormData();

    for (var key in strings) {
        var encryptedString = $.jCryption.encrypt(strings[key], theKey);
        formData.append(key, encryptedString);
    }

    if (file) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (function (theFile) {
            var encryptedFilename = $.jCryption.encrypt(file.name, theKey);
            formData.append("filename", encryptedFilename);
            formData.append("file", $.jCryption.encrypt(reader.result, theKey));
            xmlhttp.send(formData);
        })
    } else {
        xmlhttp.send(formData);
    }

}


function createGroup() {
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            clearInputFile();
            document.getElementById("inputField").value = "";
            setTimeout(function () {
                getNews();
            }, 1000);
            hideInputField();
        }
        $('#refresh_button').removeAttr("disabled");
    }
  
    var strings = [];
    strings["name"] = document.getElementById("inputField").value;
    strings["member"] = answerID;

    send(strings, "createGroup.php", onreadystatechange, document.getElementById("inputFile").files[0]);
    $("#refresh_button").attr("disabled", "disabled");
}

function addMember(group, id) {
    cancelCurrentMode();
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            setTimeout(function () {
                getNews();
            }, 1000);
        }
    }

    var strings = [];
    strings["group"] = group;
    strings["member"] = id;

    send(strings, "addMember.php", onreadystatechange);
}

function changeRole(group, id) {
    cancelCurrentMode();
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            setTimeout(function () {
                getNews();
            }, 1000);
        }
    }

    var strings = [];
    strings["group"] = group;
    strings["member"] = id;
    var admin = false;
    for (var i = 0; i < groups[group]["members"].length; i++) {
        if (groups[group]["members"][i]["id"] === id) {
            admin = !groups[group]["members"][i]["admin"];
        }
    }
    strings["admin"] = admin ? "1" : "0";

    send(strings, "changeRole.php", onreadystatechange);
}

function removeMember(group, id) {
    cancelCurrentMode();
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            setTimeout(function () {
                getNews();
            }, 1000);
        }
    }

    var strings = [];
    strings["group"] = group;
    strings["member"] = id;

    send(strings, "removeMember.php", onreadystatechange);
}

function addNewContact() {
    cancelCurrentMode();
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            clearInputFile();
            document.getElementById("inputField").value = "";
            setTimeout(function () {
                getNews();
            }, 1000);            
            hideInputField();
        }
    }
 
    var strings = [];
    strings["number"] = document.getElementById("inputField").value;

    send(strings, "addContact.php", onreadystatechange);

}


function newGroup()
{
    switchToMode(MODE_CREATEGROUP);
}

function newContact()
{
    switchToMode(MODE_ADDCONTACT);
    showInputField();
}

function newMember(group) {
    switchToMode(MODE_ADDMEMBER);
    answerGroup = group;
}


function sendButtonOnClick()
{
    if (currentMode === MODE_CREATEGROUP)
        createGroup();
    else if (currentMode === MODE_ADDMEMBER)
        addMember();
    else if (currentMode === MODE_ADDCONTACT)
        addNewContact();
    else
        sendMessage();
}

function setMessageAsRead(id, wid, group_id, sender_id) {    
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            $('#m' + id + ' .message-status').removeAttr("onclick");
        } else {
            $('#m' + id + ' .message-status').removeAttr("disabled");
        }
    }
    var strings = [];
    strings["id"] = wid;
    strings["group_id"] = group_id;
    strings["sender_id"] = sender_id;

    send(strings, "setMessageAsRead.php", onreadystatechange);
    $('#m' + id + ' .message-status').attr("disabled", "disabled");
}




var nmb = 0;
var tempMedia;
function getCodeForPicture(path, pathThumbnail, group, title, width, height)
{
    getMedia(pathThumbnail, "#l" + (++nmb), true, "picture");

    return "<a href=\"" + path + "\" id=\"l" + nmb + "\" class=\"lg" + group + "\" data-sub-html=\"<p>" + title + "</p>\" data-exthumbimage=\"" + pathThumbnail + "\"><div class=\"mdl-card mdl-shadow--2dp card-image mdl-cell\" style=\"" + (width > 0 && height > 0 ? "height:" + height +" px;width:" + width + " px" : "") + "\"><div class=\"mdl-card__title mdl-card--expand\"></div></div></a>";
}

function getMedia(path, scope, thumbnail, type)
{
    var onreadystatechange = function (xmlhttp) {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            setMedia($.jCryption.decrypt(xmlhttp.responseText, theKey), scope, thumbnail, type);
        }
    }
    var strings = [];
    strings["id"] = path;

    send(strings, "getMedia.php", onreadystatechange, null, true);
}

function setMedia(base64, scope, thumbnail, type)
{
    if (thumbnail && $(scope + " .card-image").length)
    {
        $(scope + " .card-image").css("background-image", "url(" + base64 + ")");
        $(scope).attr("data-exthumbimage", base64);
    }
    else if (!thumbnail && scope.length) {        
        scope.attr("src", base64);
        if (type === "video")
            scope.parent().load();
        if (type === "audio") {
            scope.parent().jPlayer("load");
            scope.parent().jPlayer("play");
        }
    }
    else
        setTimeout(function () { setPicture(base64, scope); }, 100);
}


function getCodeForVideo(path, pathThumbnail, group, title) {
    getMedia(pathThumbnail, "#l" + (++nmb), true, "picture");

    code = "<div style=\"display:none;\" id=\"v" + nmb + "\"><video class=\"lg-video-object lg-html5 video-js vjs-default-skin\" controls preload=\"none\"><source src=\"" + path + "\" type=\"video/mp4\">Your browser does not support HTML5 video.</video></div>";
    return code + "<a id=\"l" + nmb + "\" href=\"\" data-html=\"#v" + nmb + "\" class=\"lg" + group + "\" data-sub-html=\"<p>" + title + "</p>\" data-exthumbimage=\"" + pathThumbnail + "\" ><div class=\"mdl-card mdl-shadow--2dp card-image mdl-cell\" style=\"\"><div class=\"mdl-card__title mdl-card--expand\"></div></div></a>";
}

function onAudioDownload(player) {
    var element = $("#" + player.id + " audio");
    if (!element.attr("base64Loaded")) {
        element.attr("base64Loaded", "true");
        getMedia(element.attr("src"), element, false, "audio");
    }
}

function getCodeForAudio(path) {
    return "<a class=\"audio {onPlay: onAudioDownload, showControls: false}\"  href=\"" + path + "\">Audio</a>";
}

function showEmoji(category)
{
	$(".emoji-tab").css("display", "none");
	$("#emoji-" + category).css("display", "block");
}

function idFromJid(jid)
{
    return jid.substring(0, jid.indexOf("@"));
}