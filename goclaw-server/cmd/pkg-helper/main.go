package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/user"
	"regexp"
	"sort"
	"strings"
	"syscall"
)

const (
	socketPath = "/tmp/pkg.sock"
	apkList    = "/app/data/.runtime/apk-packages"
)

var packageNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+:-]*$`)

type request struct {
	Action  string `json:"action"`
	Package string `json:"package"`
}

type response struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func main() {
	_ = os.Remove(socketPath)
	ln, err := net.Listen("unix", socketPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer ln.Close()
	if err := configureSocket(socketPath); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	for {
		conn, err := ln.Accept()
		if err != nil {
			continue
		}
		go handle(conn)
	}
}

func configureSocket(path string) error {
	g, err := user.LookupGroup("goclaw")
	if err == nil {
		var gid int
		if _, scanErr := fmt.Sscanf(g.Gid, "%d", &gid); scanErr == nil {
			_ = os.Chown(path, 0, gid)
		}
	}
	return os.Chmod(path, 0660)
}

func handle(conn net.Conn) {
	defer conn.Close()
	scanner := bufio.NewScanner(conn)
	enc := json.NewEncoder(conn)
	if !scanner.Scan() {
		_ = enc.Encode(response{OK: false, Error: "empty request"})
		return
	}
	var req request
	if err := json.Unmarshal(scanner.Bytes(), &req); err != nil {
		_ = enc.Encode(response{OK: false, Error: err.Error()})
		return
	}
	if err := handleRequest(req); err != nil {
		_ = enc.Encode(response{OK: false, Error: err.Error()})
		return
	}
	_ = enc.Encode(response{OK: true})
}

func handleRequest(req request) error {
	pkg := strings.TrimSpace(req.Package)
	if !packageNamePattern.MatchString(pkg) {
		return errors.New("invalid package name")
	}
	switch req.Action {
	case "install":
		if err := runAPK("add", "--no-cache", pkg); err != nil {
			return err
		}
		return updatePersistedPackages(pkg, true)
	case "uninstall":
		if err := runAPK("del", pkg); err != nil {
			return err
		}
		return updatePersistedPackages(pkg, false)
	default:
		return errors.New("invalid action")
	}
}

func runAPK(args ...string) error {
	cmd := exec.Command("apk", args...)
	out, err := cmd.CombinedOutput()
	if err == nil {
		return nil
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		if status, ok := exitErr.Sys().(syscall.WaitStatus); ok {
			return fmt.Errorf("apk failed with status %d: %s", status.ExitStatus(), strings.TrimSpace(string(out)))
		}
	}
	return fmt.Errorf("apk failed: %s", strings.TrimSpace(string(out)))
}

func updatePersistedPackages(pkg string, add bool) error {
	packages := map[string]struct{}{}
	data, err := os.ReadFile(apkList)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			packages[line] = struct{}{}
		}
	}
	if add {
		packages[pkg] = struct{}{}
	} else {
		delete(packages, pkg)
	}
	list := make([]string, 0, len(packages))
	for name := range packages {
		list = append(list, name)
	}
	sort.Strings(list)
	content := ""
	if len(list) > 0 {
		content = strings.Join(list, "\n") + "\n"
	}
	return os.WriteFile(apkList, []byte(content), 0640)
}
