import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

type SelectDropdownProps = {
  label?: string;
  value: string;
  placeholder?: string;
  options: string[];
  onChange: (value: string) => void;
  zIndex?: number;
};

export default function SelectDropdown({
  label,
  value,
  placeholder = "Pilih",
  options,
  onChange,
  zIndex = 1,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrapper, { zIndex }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpen((prev) => !prev)}
      >
        <Text style={[styles.buttonText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.text} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
            {options.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  value === item && styles.optionActive,
                ]}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    value === item && styles.optionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 6,
  },
  button: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  placeholder: {
    color: Colors.textSoft,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    color: Colors.text,
    fontSize: 14,
  },
  optionTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});