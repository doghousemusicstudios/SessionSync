-- SessionSync for Reaper
-- Syncs track names and colors from Google Sheets

local json = require("json") -- You may need to install a JSON library
local socket = require("socket")

-- Configuration
local SYNC_FILE = os.getenv("HOME") .. "/SessionSync/temp/reaper_sync.json"
local CHECK_INTERVAL = 1.0 -- Check for updates every second
local last_modified = 0

-- Color mapping (hex to Reaper color integer)
local COLOR_MAP = {
    ["#FF0000"] = 16777471,  -- Red
    ["#00FF00"] = 65407,     -- Green
    ["#0000FF"] = 255,       -- Blue
    ["#FFFF00"] = 16777087,  -- Yellow
    ["#FF00FF"] = 16711935,  -- Magenta
    ["#00FFFF"] = 65535,     -- Cyan
    ["#FFFFFF"] = 16777215,  -- White
    ["#000000"] = 0,         -- Black
    ["#FF8000"] = 16744575,  -- Orange
    ["#8000FF"] = 8388863,   -- Purple
    ["#FF0080"] = 16711807,  -- Pink
    ["#80FF00"] = 8454143,   -- Lime
    ["#00FF80"] = 65407,     -- Mint
    ["#0080FF"] = 33023,     -- Sky
    ["#8080FF"] = 8421631,   -- Lavender
    ["#FF8080"] = 16744703   -- Coral
}

-- Helper function to convert hex to Reaper color
function hexToReaperColor(hex)
    local color = COLOR_MAP[hex:upper()]
    if color then
        return color
    end
    
    -- Convert hex to RGB if not in map
    hex = hex:gsub("#", "")
    local r = tonumber(hex:sub(1, 2), 16) or 0
    local g = tonumber(hex:sub(3, 4), 16) or 0
    local b = tonumber(hex:sub(5, 6), 16) or 0
    
    -- Reaper uses BGR format
    return (b * 65536) + (g * 256) + r
end

-- Check if file has been modified
function fileModified(path)
    local file = io.popen("stat -c %Y \"" .. path .. "\" 2>/dev/null")
    if not file then
        -- Windows fallback
        file = io.popen("forfiles /P \"" .. path:match("(.*[/\\])") .. "\" /M \"" .. path:match("([^/\\]+)$") .. "\" /C \"cmd /c echo @fdate @ftime\" 2>nul")
    end
    
    if file then
        local result = file:read("*a")
        file:close()
        return result ~= tostring(last_modified)
    end
    return false
end

-- Read JSON file
function readJsonFile(path)
    local file = io.open(path, "r")
    if not file then
        return nil
    end
    
    local content = file:read("*a")
    file:close()
    
    -- Simple JSON parser (replace with proper library)
    -- This is a basic implementation
    local success, data = pcall(function()
        return load("return " .. content:gsub('(["\']-)([%w_]+)%s*:', '[%1%2%1]='))()
    end)
    
    if success then
        return data
    end
    return nil
end

-- Apply track data to Reaper
function applyTrackData(tracks)
    if not tracks then return end
    
    for _, trackData in ipairs(tracks) do
        local trackNum = tonumber(trackData.number)
        if trackNum then
            local track = reaper.GetTrack(0, trackNum - 1)
            if track then
                -- Set track name
                if trackData.name then
                    reaper.GetSetMediaTrackInfo_String(track, "P_NAME", trackData.name, true)
                end
                
                -- Set track color
                if trackData.color then
                    local color = hexToReaperColor(trackData.color)
                    reaper.SetTrackColor(track, color)
                end
                
                -- Set mute state
                if trackData.mute ~= nil then
                    reaper.SetMediaTrackInfo_Value(track, "B_MUTE", trackData.mute and 1 or 0)
                end
                
                -- Set solo state
                if trackData.solo ~= nil then
                    reaper.SetMediaTrackInfo_Value(track, "I_SOLO", trackData.solo and 1 or 0)
                end
                
                -- Set fader level (convert from 0-1 to dB)
                if trackData.fader then
                    local db = 20 * math.log(trackData.fader, 10)
                    local vol = reaper.DB2SLIDER(db)
                    reaper.SetMediaTrackInfo_Value(track, "D_VOL", vol)
                end
            end
        end
    end
    
    -- Update arrange view
    reaper.UpdateArrange()
end

-- Main update function
function checkForUpdates()
    if fileModified(SYNC_FILE) then
        local data = readJsonFile(SYNC_FILE)
        if data and data.tracks then
            applyTrackData(data.tracks)
            reaper.ShowConsoleMsg("SessionSync: Updated " .. #data.tracks .. " tracks\n")
            
            -- Update last modified time
            local file = io.open(SYNC_FILE, "r")
            if file then
                last_modified = file:seek("end")
                file:close()
            end
        end
    end
end

-- Create menu action
function createMenu()
    local menu = {
        "SessionSync",
        "",
        "Sync Now|",
        "Auto Sync " .. (AUTO_SYNC and "On" or "Off") .. "|",
        "",
        "Settings...|",
        "About|"
    }
    
    local ret = reaper.ShowPopupMenu(table.concat(menu, "\n"), "tpmenu")
    
    if ret == 3 then
        -- Sync Now
        checkForUpdates()
    elseif ret == 4 then
        -- Toggle Auto Sync
        AUTO_SYNC = not AUTO_SYNC
    elseif ret == 6 then
        -- Settings
        showSettings()
    elseif ret == 7 then
        -- About
        reaper.ShowMessageBox(
            "SessionSync for Reaper\n\n" ..
            "Version 1.0.0\n" ..
            "Sync track data from Google Sheets\n\n" ..
            "github.com/doghousemusicstudios/sessionsync",
            "About SessionSync",
            0
        )
    end
end

-- WebSocket client for real-time updates
function connectWebSocket()
    local client = socket.tcp()
    client:settimeout(0.1)
    
    local success, err = client:connect("localhost", 8766)
    if not success then
        return nil
    end
    
    -- Send handshake
    client:send("GET / HTTP/1.1\r\n" ..
                "Host: localhost:8766\r\n" ..
                "Upgrade: websocket\r\n" ..
                "Connection: Upgrade\r\n" ..
                "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n" ..
                "Sec-WebSocket-Version: 13\r\n\r\n")
    
    return client
end

-- Initialize
function init()
    -- Create SessionSync directory if it doesn't exist
    os.execute("mkdir -p ~/SessionSync/temp 2>/dev/null")
    os.execute("if not exist \"%USERPROFILE%\\SessionSync\\temp\" mkdir \"%USERPROFILE%\\SessionSync\\temp\" 2>nul")
    
    -- Show initialization message
    reaper.ShowConsoleMsg("SessionSync: Initialized\n")
    reaper.ShowConsoleMsg("Watching for updates at: " .. SYNC_FILE .. "\n")
    
    -- Try to connect to WebSocket
    ws_client = connectWebSocket()
    if ws_client then
        reaper.ShowConsoleMsg("SessionSync: Connected to bridge\n")
    end
end

-- Main loop
function main()
    checkForUpdates()
    
    -- Check WebSocket for messages
    if ws_client then
        local data, err = ws_client:receive(0)
        if data then
            -- Process WebSocket message
            if data:find("daw_sync") then
                checkForUpdates()
            end
        elseif err == "closed" then
            -- Reconnect
            ws_client = connectWebSocket()
        end
    end
    
    -- Continue loop
    reaper.defer(main)
end

-- Cleanup function
function cleanup()
    if ws_client then
        ws_client:close()
    end
end

-- Start
AUTO_SYNC = true
init()
main()

-- Register cleanup
reaper.atexit(cleanup)