<?php
ini_set("mysqli.reconnect", "1");
session_start();
$_SESSION["messagesToSend"] = true;
$_SESSION["groupsToCreate"] = true;
$_SESSION["membersToAdd"] = true;
$_SESSION["membersToRemove"] = true;
$_SESSION["contactsToAdd"] = true;
$_SESSION["rolesToChange"] = true;
session_write_close();

$starttime = time();
$time = $_SESSION["running"];

$mysqli = new mysqli("db586264614.db.1and1.com", "dbo586264614", "#Budapest1101", "db586264614");

function running($time, $starttime)
{
    //Compare initial timestamp in session
    //and current timestamp in session. This
    //timestamp is updated each time index.php
    //is called (page is refreshed). This will
    //kill the old socket.php processes.
    session_start();
    $running = $_SESSION["running"];
    if ($running != $time || time() - $starttime > 120) {
        //index.php refreshed by user
        die();
    }    
    session_write_close();
    return true; //continue running
}


require_once('include/ChatAPI/src/whatsprot.class.php');
require_once 'include/ChatAPI/src/events/MyEvents.php';

$username = "4915730395125";
$nickname = "Dom Test";
$password = "r5+1cnOyI6DlHnQIl/ZV8GcZKeU="; // The one we got registering the number
$debug = true;

// Create a instance of WhastPort.
$w = new WhatsProt($username, $nickname, $debug);
$events = new MyEvents($w);
$events->mysqli = $mysqli;
$events->setEventsToListenFor($events->activeEvents);

$lastPing = time();
$w->connect(); // Connect to WhatsApp network
$w->loginWithPassword($password); // logging in with the password we got!
//$w->sendOfflineStatus();
//$w->sendSetPrivacySettings('last', 'contacts');
//$events->onGroupsParticipantChangedNumber(0, '4915730395125-1448032428@g.us', time(), '4915253889669@s.whatsapp.net', 0, '4915253889661@s.whatsapp.net');

$res = $mysqli->query("SELECT * FROM contacts WHERE lastModified != 0");

foreach ($res as $row)
{
    if ($row["id"] != 0)
        $w->sendPresenceSubscription($row["id"]);
}

if (false) {
    $mysqli->query("DELETE FROM groups");
    $mysqli->query("DELETE FROM groups_contacts_join");
    $w->sendGetGroups();
}

while (running($time, $starttime)) {
    while($w->pollMessage(false));

	if (time() - $lastPing > 300)
	{
		$w->sendPing();
		$lastPing = time();
	}
    $mysqli->ping();
    session_start();
  
	if ($_SESSION["messagesToSend"] == true)
	{
		$_SESSION["messagesToSend"] = false;			
		$res = $mysqli->query("SELECT * FROM messages Left join resources on messages.resource = resources.resource_id WHERE status=0");
		$w->debugPrint($mysqli->errno . $mysqli->error);
		foreach ($res as $row)
		{
			$currentMessageID = $row["intern_id"];
            if (!$mysqli->query("UPDATE messages SET status=1 WHERE intern_id=" . $row["intern_id"]))
			{
				$w->debugPrint("Table update failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}
            
            if (!$mysqli->query("UPDATE " . ($row["isGroup"] === "0" ? "contacts" : "groups") . " SET lastUsed=CURRENT_TIMESTAMP WHERE id='" . $row['chat_id'] . "'"))
			{
				$w->debugPrint("Table update failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}

			if ($row['resource'] === NULL)
			{
				$id = $w->sendMessage($row['chat_id'] , $row['text']);				
			}
			else
			{	
                $extension = substr($row['path'], strrpos($row['path'], ".") + 1);
                if ($row['type'] === 'picture') {
				    $id = $w->sendMessageImage($row['chat_id'], $row['path'], false, 0, "", $row['text']);
                } else if ($row['type'] === 'video') {
				    $id = $w->sendMessageVideo($row['chat_id'], $row['path'], false, 0, "", $row['text']);
                } else if ($row['type'] === 'audio') {
				    $id = $w->sendMessageAudio($row['chat_id'], $row['path']);
                } else {
                    $w->debugPrint("Datei nicht unterstützt: $extension");
                    die();
                }
			}           
		}
	}	 

    while (count($_SESSION["messagesToSetAsRead"]) > 0)
    {
        $message = array_pop($_SESSION["messagesToSetAsRead"]);
        if ($message["group_id"] !== "") 
        {
            $w->sendGroupMessageRead($message["group_id"], $message["sender_id"], $message["id"], "read"); 
            $events->onMessageReceivedClient($username, $message["group_id"], $message["id"], "read", time(), $message["sender_id"]);
        }
        else 
        {
            $w->sendMessageRead($message["sender_id"], $message["id"], "read"); 
            $events->onMessageReceivedClient($username, $message["sender_id"], $message["id"], "read", time(), NULL);
        }
    }
   

    if ($_SESSION["groupsToCreate"] == true)
	{
        $_SESSION["groupsToCreate"] = false;			
		$res = $mysqli->query("SELECT * FROM groups Left join groups_contacts_join on groups.intern_id = groups_contacts_join.group_id Left join resources on groups.picture = resources.resource_id WHERE id='0'");
		
		foreach ($res as $row)
		{
            $gid = $w->sendGroupsChatCreate($row["name"], array($row["contact_id"]));
            if ($gid && $row["picture"] != 0) 
                $w->sendSetGroupPicture($gid, $row["path"]);
            if (!$mysqli->query("DELETE FROM groups WHERE intern_id=" . $row["intern_id"]))
			{
				$w->debugPrint("Table update failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}
            if (!$mysqli->query("DELETE FROM groups_contacts_join  WHERE group_id='" . $row["intern_id"] . "'"))
			{
				$w->debugPrint("Table update failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}    
        }
    }

    if ($_SESSION["membersToAdd"] == true)
	{
        $_SESSION["membersToAdd"] = false;			
		$res = $mysqli->query("SELECT * FROM groups_contacts_join WHERE new=1");
		
		foreach ($res as $row)
		{
            if (!$mysqli->query("DELETE FROM groups_contacts_join WHERE group_id='" . $row["group_id"] . "' AND contact_id='" . $row["contact_id"] . "' "))
			{
				$w->debugPrint("Table update failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}
            $w->sendGroupsParticipantsAdd($row["group_id"], $row["contact_id"]);               
        }
    }

    if ($_SESSION["membersToRemove"] == true)
	{
        $_SESSION["membersToRemove"] = false;			
		$res = $mysqli->query("SELECT * FROM groups_contacts_join WHERE remove=1");
		
		foreach ($res as $row)
		{
            if (!$mysqli->query("UPDATE groups_contacts_join SET remove=0 WHERE group_id='" . $row["group_id"] . "' AND contact_id='" . $row["contact_id"] . "' "))
			{
				$w->debugPrint("Table update failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}
            $w->sendGroupsParticipantsRemove($row["group_id"], $row["contact_id"]);                
        }
    }

    if ($_SESSION["contactsToAdd"] == true)
	{
        $_SESSION["contactsToAdd"] = false;			
		$res = $mysqli->query("SELECT * FROM contacts WHERE lastModified=0");
		
		foreach ($res as $row)
		{
            if (!$mysqli->query("DELETE FROM contacts WHERE id='" . $row["id"] . "' "))
			{
				$w->debugPrint("Table delete failed: (" . $mysqli->errno . ") " . $mysqli->error);
			}
            $events->addContacts(array($w->getJID($row["id"])));                
        }
    }

    if ($_SESSION["rolesToChange"] == true)
	{
        $_SESSION["rolesToChange"] = false;			
		$res = $mysqli->query("SELECT * FROM groups_contacts_join WHERE admin=2 OR admin=3");
		
		foreach ($res as $row)
		{
            if ($row["admin"] == 3)
                $w->sendPromoteParticipants($row["group_id"], $row["contact_id"]);
            else
                $w->sendDemoteParticipants($row["group_id"], $row["contact_id"]);
        }
    }
    session_write_close();

}
$w->debugPrint("10min Timeout");